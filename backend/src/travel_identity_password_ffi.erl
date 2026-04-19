-module(travel_identity_password_ffi).
-export([pbkdf2_sha512/4]).

%% PBKDF2-HMAC-SHA512.
%%
%% Erlang OTP `crypto:pbkdf2_hmac/5` doğrudan binary döner.
%% Tüm girişler binary, dönüş türü binary (BitArray Gleam tarafında).
pbkdf2_sha512(Password, Salt, Iterations, KeyLen)
  when is_binary(Password),
       is_binary(Salt),
       is_integer(Iterations), Iterations > 0,
       is_integer(KeyLen),     KeyLen     > 0 ->
  crypto:pbkdf2_hmac(sha512, Password, Salt, Iterations, KeyLen).
