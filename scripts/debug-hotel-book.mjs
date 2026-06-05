#!/usr/bin/env node
/**
 * Tek otel BookHotel hata ayıklama — sandbox sunucuda çalıştırın.
 *   node scripts/debug-hotel-book.mjs --from-db
 */
import {
  createTravelrobotToken,
  loadTravelrobotConfig,
  searchHotel,
  pickHotelRows,
  pickHotelSearchKey,
  getHotelRooms,
  pickHotelRoomOfferKeys,
  validateHotelRooms,
  getHotelPaymentOptions,
  bookHotel,
  buildHotelRoomPaxes,
  buildHotelValidateRooms,
} from './lib/travelrobot-api.mjs'

import { CERT_HOTEL_BY_DESTINATION } from './lib/travelrobot-sandbox-ids.mjs'

const FROM_DB = process.argv.includes('--from-db')

function addDays(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getUTCFullYear()}`
}

function makePax(firstName, lastName, dob) {
  return {
    PaxId: 0,
    PreviousPaxId: 0,
    EmployeeId: null,
    FirstName: firstName,
    LastName: lastName,
    DateOfBirth: dob,
    Email: null,
    MobilePhone: null,
    NationalityCode: 'TR',
    IdentityNumber: null,
    PassportNumber: 'AA123456',
    PassportValidityDate: '01.01.2030',
    HESCode: null,
    GenderType: 1,
    StatusType: 0,
    ReferenceId: null,
    Age: 0,
  }
}

const CONTACT = {
  RecId: 0,
  FirstName: 'TEST',
  LastName: 'TRAVELER',
  Phone: '+90 555 555 5555',
  Email: 'developer@kplus.com.tr',
  GenderType: 1,
  StatusType: 0,
}

const INVOICE = {
  RecId: 0,
  InvoiceInfoType: 1,
  InvoiceInfoTitle: 'Invoice',
  TaxOffice: '',
  TaxNumber: '',
  CompanyName: 'TEST COMPANY',
  FirstName: null,
  LastName: null,
  PostalCode: '34000',
  CityCode: 'IST',
  CityName: 'Istanbul',
  CountryCode: null,
  Address: 'Test Address',
  StatusType: 0,
}

const PAYMENTS = [
  { label: 'agency-2', info: { PaymentType: 2, PaymentItemId: '1', PaymentCommissionType: 0 } },
  { label: 'agency-str', info: { PaymentType: '2', PaymentItemId: '1', PaymentCommissionType: 0 } },
  {
    label: 'card-0',
    info: {
      PaymentType: 0,
      PaymentItemId: '1',
      PaymentCommissionType: 0,
      CardInfo: {
        Email: 'developer@kplus.com.tr',
        IpAdress: '127.0.0.1',
        CardHolderName: 'TEST TRAVELER',
        CardNumber: '4444444444444444',
        CardExpMonth: 12,
        CardExpYear: 2030,
        Cv2: '123',
        Is3D: false,
        ReturnUrl: 'http://localhost:3000/payment/return',
        CardId: null,
        SaveCard: false,
      },
    },
  },
]

async function main() {
  const cfg = FROM_DB
    ? await loadTravelrobotConfig()
    : {
        baseUrl: process.env.TRAVELROBOT_BASE_URL,
        channelCode: process.env.TRAVELROBOT_CHANNEL_CODE,
        channelPassword: process.env.TRAVELROBOT_CHANNEL_PASSWORD,
      }

  const destId = process.env.DEBUG_DEST_ID ?? '10033097'
  const hotelCode = process.env.DEBUG_HOTEL_CODE ?? CERT_HOTEL_BY_DESTINATION[destId] ?? 'KTR672265'
  const checkin = addDays(30)
  const checkout = addDays(37)
  const roomOpts = [{ RoomIndex: 0, Adults: 2, Children: 0 }]

  const { tokenCode } = await createTravelrobotToken(cfg)
  console.log('token ok, hotel', hotelCode)

  let search = await searchHotel(cfg, tokenCode, {
    checkInDate: checkin,
    checkOutDate: checkout,
    destinationId: destId,
    showMultipleRate: true,
    rooms: roomOpts,
  })
  let rows = pickHotelRows(search)
  let row = rows.find((r) => (r.HotelCode ?? r.hotelCode) === hotelCode)
  if (!row) {
    search = await searchHotel(cfg, tokenCode, {
      checkInDate: checkin,
      checkOutDate: checkout,
      destinationId: destId,
      hotelCode,
      showMultipleRate: true,
      rooms: roomOpts,
    })
    rows = pickHotelRows(search)
    row = rows.find((r) => (r.HotelCode ?? r.hotelCode) === hotelCode) ?? rows[0]
  }
  const sk = pickHotelSearchKey(search, row)
  console.log('searchKey', sk?.slice(0, 40))

  const rooms = await getHotelRooms(cfg, tokenCode, {
    productCode: hotelCode,
    searchKey: sk,
    checkInDate: checkin,
    checkOutDate: checkout,
    rooms: roomOpts,
  })
  const keys = pickHotelRoomOfferKeys(rooms, 1, roomOpts)
  console.log('room keys', keys.length, keys[0]?.slice(0, 50))

  const validate = await validateHotelRooms(cfg, tokenCode, {
    rooms: buildHotelValidateRooms(roomOpts, keys),
  })
  if (validate?.HasError) {
    console.error('validate failed', validate.ErrorMessage)
    process.exit(1)
  }
  const vr = validate.Result
  const alt = vr.Hotels[0].Rooms[0].RoomAlternatives[0]
  const postValidateCode = alt.RoomCode
  const packageIds = [
    ['roomCode-pre', keys[0]],
    ['roomCode-post', postValidateCode],
    ['searchKey', vr.SearchKey],
    ['combinationId', alt.CombinationId],
  ].filter(([, v]) => v)

  let payOpts = null
  try {
    payOpts = await getHotelPaymentOptions(cfg, tokenCode, { resultKeys: keys })
    console.log('payment options', JSON.stringify(payOpts?.Result ?? payOpts, null, 2).slice(0, 1200))
  } catch (e) {
    console.log('payment options error', e.message)
  }

  const apiPayments = []
  const items = payOpts?.Result?.PaymentOptions ?? payOpts?.Result?.Items ?? []
  if (Array.isArray(items)) {
    for (const item of items.slice(0, 3)) {
      apiPayments.push({
        label: `api-${item.PaymentType ?? item.paymentType}`,
        info: {
          PaymentType: item.PaymentType ?? item.paymentType ?? 2,
          PaymentItemId: String(item.PaymentItemId ?? item.Id ?? '1'),
          PaymentCommissionType: item.PaymentCommissionType ?? 0,
        },
      })
    }
  }

  const hotelRoomPaxes = buildHotelRoomPaxes(roomOpts, (fn, ln, dob) => makePax(fn, ln, dob))
  // fix names to TEST/TRAVELER style
  hotelRoomPaxes[0].Paxes[0].Pax = makePax('TEST', 'TRAVELER', '15.06.1990')
  hotelRoomPaxes[0].Paxes[1].Pax = makePax('TEST', 'GUEST', '15.06.1992')

  async function rawBook(body) {
    const url = `${cfg.baseUrl}/Hotel.svc/Rest/Json/BookHotel`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    return { status: res.status, text }
  }

  const packageId = postValidateCode ?? keys[0]
  const baseBody = {
    request: {
      ProcessId: null,
      Version: '2.0',
      ProductType: 1,
      TokenCode: tokenCode,
      PackageId: String(packageId),
      PaxInfo: { HotelRoomPaxes: hotelRoomPaxes, FlightPaxes: null, CarPax: null, TourRoomPaxes: null, TransferPaxes: null, PackagePaxes: null, VisaPaxes: null, ActivityPaxes: null },
      ContactInfo: CONTACT,
      InvoiceInfo: INVOICE,
      CorporateInfo: null,
      BookingNote: 'debug',
      AgentReferenceInfo: null,
      PaymentInfo: { PaymentType: 2, PaymentItemId: '1', PaymentCommissionType: 0 },
      LanguageCode: 'tr',
      WithPrice: false,
    },
  }

  for (const pt of [0, 1, 2, 3, 4, 5, '0', '1', '2']) {
    const body = {
      request: {
        ...baseBody.request,
        PackageId: String(postValidateCode ?? keys[0]),
        PaymentInfo: { PaymentType: pt, PaymentItemId: '1', PaymentCommissionType: 0 },
      },
    }
    const { status, text } = await rawBook(body)
    if (!text.includes('"HasError":true')) {
      console.log('SUCCESS paymentType', pt, text.slice(0, 400))
      return
    }
    console.log('payType', pt, text.slice(0, 120))
  }

  const variants = [
    ['base', baseBody],
    ['no-invoice', { request: { ...baseBody.request, InvoiceInfo: null } }],
    ['agent-ref-obj', { request: { ...baseBody.request, AgentReferenceInfo: { AgentReference: 'RY-1' } } }],
    ['room-index-1', {
      request: {
        ...baseBody.request,
        PaxInfo: {
          ...baseBody.request.PaxInfo,
          HotelRoomPaxes: hotelRoomPaxes.map((r) => ({ ...r, RoomIndex: 1 })),
        },
      },
    }],
    ['result-keys', {
      request: {
        ...baseBody.request,
        PackageId: null,
        ResultKeys: [String(packageId)],
      },
    }],
    ['validate-paxes', {
      request: {
        ...baseBody.request,
        PaxInfo: {
          ...baseBody.request.PaxInfo,
          HotelRoomPaxes: [{
            RoomIndex: 0,
            Paxes: [
              { RecId: 0, IsLeader: true, PaxType: 0, Pax: makePax('TEST', 'TRAVELER', '15.06.1990') },
              { RecId: 0, IsLeader: false, PaxType: 0, Pax: makePax('TEST', 'GUEST', '15.06.1992') },
            ],
          }],
        },
      },
    }],
  ]

  for (const [label, body] of variants) {
    const { status, text } = await rawBook(body)
    console.log('RAW', label, 'HTTP', status, text.slice(0, 500))
    if (text.includes('SystemPnr') && !text.includes('"HasError":true')) {
      console.log('SUCCESS variant', label)
      return
    }
  }

  for (const [pidLabel, packageId] of packageIds) {
    for (const pay of [...apiPayments, ...PAYMENTS]) {
      try {
        const res = await bookHotel(cfg, {
          tokenCode,
          packageId: String(packageId),
          hotelRoomPaxes,
          contactInfo: CONTACT,
          invoiceInfo: INVOICE,
          paymentInfo: pay.info,
          agentReferenceInfo: `RY-DEBUG-${Date.now()}`,
          bookingNote: 'debug book test',
        })
        console.log('SUCCESS', pidLabel, pay.label, res?.Result?.SystemPnr ?? res?.SystemPnr)
        return
      } catch (e) {
        console.log('FAIL', pidLabel, pay.label, '→', e.message)
      }
    }
  }
  console.log('all attempts failed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
