-module(backend_ffi_db).
-export([set_reserve_pool/1, reserve_pool/0, has_reserve/0]).

%% Yedek pog havuzu — birincil kopunca resilient_pog buradan devreye alır.
set_reserve_pool(Conn) ->
    persistent_term:put(travel_api_db_reserve_pool, Conn),
    nil.

reserve_pool() ->
    case catch persistent_term:get(travel_api_db_reserve_pool) of
        Conn -> {ok, Conn};
        {'EXIT', {badarg, _}} -> nil
    end.

has_reserve() ->
    case catch persistent_term:get(travel_api_db_reserve_pool) of
        {'EXIT', {badarg, _}} -> false;
        _ -> true
    end.
