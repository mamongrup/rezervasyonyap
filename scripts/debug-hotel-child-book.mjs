#!/usr/bin/env node
/** S2 debug: 2 ADT + 1 CHD(5) book */
import {
  createTravelrobotToken,
  loadTravelrobotConfig,
  searchHotel,
  pickHotelRows,
  pickHotelSearchKey,
  getHotelRooms,
  pickHotelRoomOfferKeys,
  pickHotelRoomOfferKeyCandidates,
  validateHotelRooms,
  bookHotel,
  buildHotelRoomPaxes,
  buildHotelValidateRooms,
  pickHotelBookResultKeys,
} from './lib/travelrobot-api.mjs'

const roomOpts = [{ RoomIndex: 0, Adults: 2, Children: 1, ChildAges: [5] }]

function addDays(n) {
  const d = new Date(); d.setUTCDate(d.getUTCDate() + n)
  return `${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()}`
}

function makePax(fn, ln, dob, age = 30) {
  return { PaxId:0,PreviousPaxId:0,EmployeeId:null,FirstName:fn,LastName:ln,DateOfBirth:dob,Email:null,MobilePhone:null,NationalityCode:'TR',IdentityNumber:null,PassportNumber:'AA123456',PassportValidityDate:'01.01.2030',HESCode:null,GenderType:1,StatusType:0,ReferenceId:null,Age:age }
}

async function tryHotel(cfg, tokenCode, hotelCode, destId) {
  const checkin = addDays(30), checkout = addDays(37)
  let search = await searchHotel(cfg, tokenCode, { checkInDate: checkin, checkOutDate: checkout, destinationId: destId, showMultipleRate: true, rooms: roomOpts })
  let rows = pickHotelRows(search)
  let row = rows.find((r) => (r.HotelCode ?? r.hotelCode) === hotelCode) ?? rows[0]
  if (!row || (row.HotelCode ?? row.hotelCode) !== hotelCode) {
    search = await searchHotel(cfg, tokenCode, { checkInDate: checkin, checkOutDate: checkout, destinationId: destId, hotelCode, showMultipleRate: true, rooms: roomOpts })
    rows = pickHotelRows(search)
    row = rows.find((r) => (r.HotelCode ?? r.hotelCode) === hotelCode) ?? rows[0]
  }
  const sk = pickHotelSearchKey(search, row)
  if (!sk) return console.log(hotelCode, 'no search key')
  const rooms = await getHotelRooms(cfg, tokenCode, { productCode: hotelCode, searchKey: sk, rooms: roomOpts })
  const candidates = pickHotelRoomOfferKeyCandidates(rooms, roomOpts)
  for (const key of candidates.slice(0, 8)) {
    try {
      const validate = await validateHotelRooms(cfg, tokenCode, {
        rooms: buildHotelValidateRooms(roomOpts, [key], { includePaxes: true }),
      })
      if (validate?.HasError) { console.log(hotelCode, key.slice(0,40), 'val', validate.ErrorMessage); continue }
      const resultKeys = pickHotelBookResultKeys(validate, [key])
      const paxes = buildHotelRoomPaxes(roomOpts, (fn, ln, dob) => makePax(fn, ln, dob))
      const res = await bookHotel(cfg, {
        tokenCode,
        resultKeys,
        hotelRoomPaxes: paxes,
        contactInfo: { RecId:0,FirstName:'TEST',LastName:'TRAVELER',Phone:'+90 555 555 5555',Email:'developer@kplus.com.tr',GenderType:1,StatusType:0 },
        invoiceInfo: { RecId:0,InvoiceInfoType:1,InvoiceInfoTitle:'Invoice',TaxOffice:'',TaxNumber:'',CompanyName:'TEST COMPANY',FirstName:null,LastName:null,PostalCode:'34000',CityCode:'IST',CityName:'Istanbul',CountryCode:null,Address:'Test Address',StatusType:0 },
        paymentInfo: { PaymentType: 2, PaymentItemId: '1', PaymentCommissionType: 0 },
        bookingNote: 'child debug',
      })
      console.log('SUCCESS', hotelCode, res?.Result?.Booking?.SystemPnr)
      return
    } catch (e) {
      console.log('FAIL', hotelCode, key.slice(0,40), e.message)
    }
  }
}

async function main() {
  const cfg = await loadTravelrobotConfig()
  const { tokenCode } = await createTravelrobotToken(cfg)
  for (const [code, dest] of [['KTR672265','10033097'],['KDE646930','587926'],['KCZ466838','531096']]) {
    await tryHotel(cfg, tokenCode, code, dest)
  }
}

main().catch(console.error)
