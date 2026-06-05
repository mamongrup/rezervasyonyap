-module(backend_ffi_http).
-export([
  post_urlencoded/2,
  get_url/1,
  get_url_with_auth/2,
  post_json/3,
  post_json_with_timeout/4,
  post_json_turna/5,
  parse_tcmb_xml/1
]).

post_urlencoded(Url, Body) when is_binary(Url), is_binary(Body) ->
  {ok, _} = application:ensure_all_started(inets),
  {ok, _} = application:ensure_all_started(ssl),
  UrlStr = binary_to_list(Url),
  BodyStr = binary_to_list(Body),
  Request = {UrlStr, [], "application/x-www-form-urlencoded; charset=UTF-8", BodyStr},
  HttpOptions = [{timeout, timer:seconds(25)}, {ssl, [{verify, verify_none}]}],
  Options = [],
  case httpc:request(post, Request, HttpOptions, Options) of
    {ok, {{_, Status, _}, _Headers, RespBody}} ->
      Bin = iolist_to_binary(RespBody),
      case Status >= 200 andalso Status < 500 of
        true -> {ok, Bin};
        false -> {error, Bin}
      end;
    {error, Reason} ->
      {error, iolist_to_binary(io_lib:format("~p", [Reason]))}
  end.

%% Authorization: Bearer … veya boş (webhook için).
post_json(Url, Body, AuthHeader) when is_binary(Url), is_binary(Body), is_binary(AuthHeader) ->
  post_json_with_timeout(Url, Body, AuthHeader, 180000).

%% TimeoutMs: Gleam (panel site_settings.ai) ile gelir; teknik 5 sn – 10000 sn (ms).
post_json_with_timeout(Url, Body, AuthHeader, TimeoutMs)
  when is_binary(Url), is_binary(Body), is_binary(AuthHeader), is_integer(TimeoutMs) ->
  {ok, _} = application:ensure_all_started(inets),
  {ok, _} = application:ensure_all_started(ssl),
  T = case TimeoutMs < 5000 of
    true -> 5000;
    false ->
      case TimeoutMs > 10000000 of
        true -> 10000000;
        false -> TimeoutMs
      end
  end,
  UrlStr = binary_to_list(Url),
  BodyStr = binary_to_list(Body),
  Headers =
    case AuthHeader of
      <<>> -> [];
      A -> [{"Authorization", binary_to_list(A)}]
    end,
  Request = {UrlStr, Headers, "application/json; charset=UTF-8", BodyStr},
  HttpOptions = [
    {connect_timeout, 60000},
    {timeout, T},
    {ssl, [{verify, verify_none}]}
  ],
  Options = [],
  case httpc:request(post, Request, HttpOptions, Options) of
    {ok, {{_, Status, _}, _Headers, RespBody}} ->
      Bin = iolist_to_binary(RespBody),
      case Status >= 200 andalso Status < 300 of
        true -> {ok, Bin};
        false -> {error, Bin}
      end;
    {error, Reason} ->
      {error, iolist_to_binary(io_lib:format("~p", [Reason]))}
  end.

%% Turna uçak API — opsiyonel Turna-Session-* başlıkları; yanıt gövdesi + oturum başlıkları JSON zarfında.
%% Başarı: {ok, <<"{\"body\":\"...\",\"session_id\":\"...\",\"session_token\":\"...\"}">>}}
%% HTTP hata: {error, aynı zarf (body alanında Turna hata JSON'u)}}
post_json_turna(Url, Body, SessionId, SessionToken, TimeoutMs)
  when is_binary(Url), is_binary(Body), is_binary(SessionId), is_binary(SessionToken), is_integer(TimeoutMs) ->
  {ok, _} = application:ensure_all_started(inets),
  {ok, _} = application:ensure_all_started(ssl),
  T = case TimeoutMs < 5000 of
    true -> 5000;
    false ->
      case TimeoutMs > 10000000 of
        true -> 10000000;
        false -> TimeoutMs
      end
  end,
  UrlStr = binary_to_list(Url),
  BodyStr = binary_to_list(Body),
  Extra =
    lists:filtermap(
      fun({K, V}) ->
        case V of
          <<>> -> false;
          _ -> {true, {binary_to_list(K), binary_to_list(V)}}
        end
      end,
      [
        {<<"Turna-Session-Id">>, SessionId},
        {<<"Turna-Session-Token">>, SessionToken}
      ]
    ),
  Request = {UrlStr, Extra, "application/json; charset=UTF-8", BodyStr},
  HttpOptions = [
    {connect_timeout, 60000},
    {timeout, T},
    {ssl, [{verify, verify_none}]}
  ],
  case httpc:request(post, Request, HttpOptions, []) of
    {ok, {{_, Status, _}, RespHeaders, RespBody}} ->
      Bin = iolist_to_binary(RespBody),
      Sid = turna_header_value(RespHeaders, "turna-session-id"),
      Stok = turna_header_value(RespHeaders, "turna-session-token"),
      Envelope = turna_envelope_json(Bin, Sid, Stok),
      case Status >= 200 andalso Status < 300 of
        true -> {ok, Envelope};
        false -> {error, Envelope}
      end;
    {error, Reason} ->
      {error, iolist_to_binary(io_lib:format("~p", [Reason]))}
  end.

turna_header_value(Headers, NameLower) ->
  Name = string:lowercase(NameLower),
  case lists:dropwhile(fun({K, _}) -> string:lowercase(K) =/= Name end, Headers) of
    [{_, V} | _] -> list_to_binary(V);
    _ -> <<>>
  end.

turna_envelope_json(BodyBin, SessionId, SessionToken) ->
  <<
    "{\"body\":",
    (json_string(BodyBin))/binary,
    ",\"session_id\":",
    (json_string(SessionId))/binary,
    ",\"session_token\":",
    (json_string(SessionToken))/binary,
    "}"
  >>.

json_string(Bin) when is_binary(Bin) ->
  Esc = lists:flatmap(fun json_escape_char/1, binary_to_list(Bin)),
  <<"\"", (list_to_binary(Esc))/binary, "\"">>.

json_escape_char($") -> "\\\"";
json_escape_char($\\) -> "\\\\";
json_escape_char($\n) -> "\\n";
json_escape_char($\r) -> "\\r";
json_escape_char($\t) -> "\\t";
json_escape_char(C) when C < 32 -> [];
json_escape_char(C) -> [C].

get_url(Url) when is_binary(Url) ->
  get_url_with_auth(Url, <<>>).

%% Authorization: Bearer … veya boş.
get_url_with_auth(Url, AuthHeader) when is_binary(Url), is_binary(AuthHeader) ->
  {ok, _} = application:ensure_all_started(inets),
  {ok, _} = application:ensure_all_started(ssl),
  UrlStr = binary_to_list(Url),
  Headers =
    case AuthHeader of
      <<>> -> [];
      A -> [{"Authorization", binary_to_list(A)}]
    end,
  HttpOptions = [{timeout, timer:seconds(25)}, {ssl, [{verify, verify_none}]}],
  case httpc:request(get, {UrlStr, Headers}, HttpOptions, []) of
    {ok, {{_, Status, _}, _Headers, RespBody}} ->
      Bin = iolist_to_binary(RespBody),
      case Status >= 200 andalso Status < 300 of
        true -> {ok, Bin};
        false -> {error, Bin}
      end;
    {error, Reason} ->
      {error, iolist_to_binary(io_lib:format("~p", [Reason]))}
  end.

%% TCMB today.xml'i doğrudan binary:split ile ayrıştır.
%% string:split UTF-8 doğrulaması yaptığı için Türkçe karakterlerde hata verebilir;
%% binary:split ise encoding-bağımsız byte seviyesinde çalışır.
%% NOT: "<Currency " (boşlukla) kullanılır; "<CurrencyName>" ile karışmaması için.
%% Döndürür: [{<<"USD">>, 44.6989}, ...] biçiminde liste.
parse_tcmb_xml(Body) when is_binary(Body) ->
  %% "<Currency " ile split: sadece açılış taglarını yakala, <CurrencyName> ile karışma
  Chunks = binary:split(Body, <<"<Currency ">>, [global]),
  case Chunks of
    [_Header | Rest] ->
      lists:filtermap(fun parse_currency_chunk/1, Rest);
    _ ->
      []
  end.

parse_currency_chunk(Chunk) ->
  Kod = get_attr(Chunk, <<"Kod">>),
  case Kod of
    <<>> -> false;
    _ ->
      Rate = get_rate(Chunk),
      case Rate of
        not_found -> false;
        R ->
          Unit = get_unit(Chunk),
          Adjusted = case Unit > 1 of
            true -> R / float(Unit);
            false -> R
          end,
          {true, {Kod, Adjusted}}
      end
  end.

%% XML attribute: Name="Value" → Value
get_attr(Bin, Name) ->
  Needle = <<Name/binary, "=\"">>,
  case binary:split(Bin, Needle) of
    [_, Rest] ->
      case binary:split(Rest, <<"\"">>) of
        [Val | _] -> Val;
        _ -> <<>>
      end;
    _ -> <<>>
  end.

%% İlk geçerli kur: ForexBuying, yoksa BanknoteBuying
get_rate(Chunk) ->
  RawBuying = get_tag(Chunk, <<"ForexBuying">>),
  Raw = case RawBuying of
    <<>> -> get_tag(Chunk, <<"BanknoteBuying">>);
    V -> V
  end,
  case Raw of
    <<>> -> not_found;
    S ->
      Trimmed = string:trim(S),
      case catch binary_to_float(Trimmed) of
        {'EXIT', _} ->
          case catch binary_to_integer(Trimmed) of
            {'EXIT', _} -> not_found;
            N -> float(N)
          end;
        F -> F
      end
  end.

%% <Tag>Value</Tag> → Value
get_tag(Bin, Tag) ->
  Open = <<"<", Tag/binary, ">">>,
  Close = <<"</", Tag/binary, ">">>,
  case binary:split(Bin, Open) of
    [_, Rest] ->
      case binary:split(Rest, Close) of
        [Val | _] -> string:trim(Val);
        _ -> <<>>
      end;
    _ -> <<>>
  end.

%% <Unit>N</Unit> → integer N (varsayılan 1)
get_unit(Chunk) ->
  Raw = get_tag(Chunk, <<"Unit">>),
  case Raw of
    <<>> -> 1;
    S ->
      case catch binary_to_integer(string:trim(S)) of
        {'EXIT', _} -> 1;
        N -> N
      end
  end.
