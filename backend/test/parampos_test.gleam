import gleeunit
import gleeunit/should
import travel/integrations/parampos

pub fn main() {
  gleeunit.main()
}

pub fn official_tp_wmd_ucd_sha2b64_example_test() {
  parampos.sha2b64(
    "107380c13d406-873b-403b-9c09-a5766840d98c1100,00100,00TestsiparisId100",
  )
  |> should.equal("RVn2aKnWmH013VpCpPInXUOVJBM=")
}

pub fn callback_hash_is_deterministic_test() {
  let one =
    parampos.callback_hash(
      "0C13D406-873B-403B-9C09-A5766840D98C",
      "tx",
      "md",
      "1",
      "order",
    )
  let two =
    parampos.callback_hash(
      "0c13d406-873b-403b-9c09-a5766840d98c",
      "tx",
      "md",
      "1",
      "order",
    )
  one |> should.equal(two)
}
