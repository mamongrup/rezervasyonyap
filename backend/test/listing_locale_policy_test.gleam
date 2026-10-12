import gleeunit/should
import travel/ai/listing_locale_policy

pub fn tours_only_generate_turkish_test() {
  listing_locale_policy.locales(" TOUR ") |> should.equal(["tr"])
}

pub fn required_categories_keep_all_six_languages_test() {
  let expected = ["tr", "en", "de", "ru", "zh", "fr"]
  listing_locale_policy.locales("hotel") |> should.equal(expected)
  listing_locale_policy.locales("holiday_home") |> should.equal(expected)
  listing_locale_policy.locales("yacht_charter") |> should.equal(expected)
  listing_locale_policy.locales("cruise") |> should.equal(expected)
  listing_locale_policy.locales("activity") |> should.equal(expected)
}
