import gleeunit/should
import travel/integrations/yolcu360_config.{Yolcu360Config}

pub fn staging_inventory_is_not_public_test() {
  yolcu360_config.public_sales_ready(Yolcu360Config(
    enabled: True,
    base_url: "https://staging.api.pro.yolcu360.com/api/v1",
    api_key: "fixture",
    api_secret: "fixture",
  ))
  |> should.equal(False)
}

pub fn disabled_production_is_not_public_test() {
  yolcu360_config.public_sales_ready(Yolcu360Config(
    enabled: False,
    base_url: "https://api.pro.yolcu360.com/api/v1",
    api_key: "fixture",
    api_secret: "fixture",
  ))
  |> should.equal(False)
}

pub fn configured_production_passes_environment_gate_test() {
  yolcu360_config.public_sales_ready(Yolcu360Config(
    enabled: True,
    base_url: "https://api.pro.yolcu360.com/api/v1/",
    api_key: "fixture",
    api_secret: "fixture",
  ))
  |> should.equal(True)
}
