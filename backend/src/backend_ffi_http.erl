-module(backend_ffi_http).
-export([post_urlencoded/2, get_url/1, post_json/3]).

post_urlencoded(Url, Body) when is_binary(Url), is_binary(Body) ->
  ok = application:ensure_all_started(inets),
  ok = application:ensure_all_started(ssl),
  UrlStr = binary_to_list(Url),
  BodyStr = binary_to_list(Body),
  Request = {UrlStr, [], "application/x-www-form-urlencoded; charset=UTF-8", BodyStr},
  HttpOptions = [{timeout, timer:seconds(25)}],
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
  ok = application:ensure_all_started(inets),
  ok = application:ensure_all_started(ssl),
  UrlStr = binary_to_list(Url),
  BodyStr = binary_to_list(Body),
  Headers =
    case AuthHeader of
      <<>> -> [];
      A -> [{"Authorization", binary_to_list(A)}]
    end,
  Request = {UrlStr, Headers, "application/json; charset=UTF-8", BodyStr},
  HttpOptions = [{timeout, timer:seconds(25)}],
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

get_url(Url) when is_binary(Url) ->
  ok = application:ensure_all_started(inets),
  ok = application:ensure_all_started(ssl),
  UrlStr = binary_to_list(Url),
  case httpc:request(get, {UrlStr, []}, [{timeout, timer:seconds(25)}], []) of
    {ok, {{_, Status, _}, _Headers, RespBody}} ->
      Bin = iolist_to_binary(RespBody),
      case Status >= 200 andalso Status < 300 of
        true -> {ok, Bin};
        false -> {error, Bin}
      end;
    {error, Reason} ->
      {error, iolist_to_binary(io_lib:format("~p", [Reason]))}
  end.
