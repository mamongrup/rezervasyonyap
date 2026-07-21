import type { LegalFaqBundle } from './types'

export const en: LegalFaqBundle = {
  metaTitle: 'Frequently Asked Questions | Rezervasyon Yap',
  metaDescription:
    'Booking, payment, cancellation, hotels, villas, tours, yachts, transport, visa, privacy and partner questions for Rezervasyon Yap and Mamon Plus Travel Agency.',
  pageTitle: 'Legal and operational frequently asked questions',
  pageLead:
    'This page explains what you should know about company identity, booking flow, payments, cancellation, accommodation, tours, transport, visa matters, account security and personal data when planning travel with {brand}.',
  categoriesHeading: 'Topics',
  backToCategories: 'Back to categories',
  openCategory: 'Open category',
  questionsCount: '{count} questions',
  categories: [
    {
      id: 'general',
      title: 'General information and company identity',
      description:
        '{brand} is the online booking platform of {agency}, offering travel products with a transparent agency service.',
      items: [
        {
          q: 'Which company operates {brand}?',
          a: '{brand} is operated by {legalName}. Travel agency services are provided under the name {agency}, registered as {tursab}. Our office address is {address}; you can contact us through {email}, {phone}, {phone2} and our office lines {officePhones}.',
        },
        {
          q: 'Do the details on the website count as an official offer?',
          a: 'Prices, availability, itineraries and visuals on the website are based on supplier data and editorial checks at the time of the request. The final service scope, payment rules and any special notes are confirmed on the booking confirmation or contract screen. If a detail is important to your decision, please request written confirmation through /contact.',
        },
        {
          q: 'Which travel products can {agency} arrange?',
          a: 'We may mediate or organize hotels, villas, package tours, daily tours, yacht charters, transfers, flights, ferries and other requested travel services. Each product may have a different supplier, operating model and cancellation rule. Please read the product page together with /legal/terms and /legal/cancellation.',
        },
        {
          q: 'How can I contact the agency before booking?',
          a: 'You can write to {email}, call the reservation lines {phone} and {phone2}, or use the /contact form. During busy periods, written requests are answered in order of receipt. For urgent travel dates, include the product name, date, number of guests and a reachable phone number.',
        },
        {
          q: 'How is the platform content prepared?',
          a: 'Product texts are prepared from supplier information, contractual conditions and editorial review. We aim to keep visitor-facing content clear, current and not misleading, but changes may occur because of hotels, carriers, vessel owners or local authorities. Current availability and scope should be checked before making important commitments.',
        },
        {
          q: 'Which legal texts should I review?',
          a: 'Please review /legal/terms for general terms of use and sale, /legal/cancellation for cancellation and refund principles, /legal/privacy for personal data and /legal/cookies for cookie preferences. These texts apply together with product-specific conditions. If a clearly stated product condition differs from the general text, it may prevail for that product.',
        },
      ],
    },
    {
      id: 'booking',
      title: 'Booking process',
      description:
        'How search, offer, pre-approval, payment and final confirmation steps work.',
      items: [
        {
          q: 'How do I create a booking?',
          a: 'Choose a product and enter the date, number of guests, room or service type and other requested details. The system may show availability and price immediately; some products require agency or supplier approval. Once payment or the required prepayment is completed, confirmed booking details are sent to your registered contact channels.',
        },
        {
          q: 'Is every request an automatic confirmed booking?',
          a: 'No. Villas, yachts, group tours, private transfers and dynamically priced stays may first need an availability check. A confirmed booking is created only after payment conditions are met and the agency confirms the service. Travel arrangements made before confirmation are at the customer’s own risk.',
        },
        {
          q: 'What details should I check before confirming?',
          a: 'Please check names, identity or passport details, dates, number of guests, age groups, room type and special requests carefully. Incorrect or missing information may cause extra charges, refusal of service or inability to process a carrier service. If you notice an error, contact {email} immediately.',
        },
        {
          q: 'Are special requests guaranteed?',
          a: 'Requests such as baby cots, connecting rooms, high floors, early check-in, special meals, yacht routes or transfer waiting time are forwarded to the supplier. They are not binding service elements unless the supplier confirms them in writing. Paid or availability-based requests may require separate approval.',
        },
        {
          q: 'When will I receive my booking documents?',
          a: 'For confirmed bookings, vouchers, contract summaries, payment details or operational notes are shared electronically. In some services, the final meeting point, guide details or captain contact may be sent closer to the travel date. Keep these documents and have them available when the service starts.',
        },
        {
          q: 'Can I change my booking?',
          a: 'Changes to date, name, guest count or service scope depend on product rules, supplier approval and availability. A change may create additional fees, price differences or new cancellation rules. Sending your request early and in writing helps reduce the risk of losing rights.',
        },
      ],
    },
    {
      id: 'payment',
      title: 'Payment, security and invoices',
      description:
        'Payment methods, collection rules, currency differences, invoicing and secure transactions.',
      items: [
        {
          q: 'Which payment methods are available?',
          a: 'Depending on the product, payment may be made by credit card, bank transfer, virtual POS, installments or secure channels notified by the agency. The method and deadline are shown on the product page or booking confirmation. Do not pay to personal accounts or unverified links outside the official payment channel.',
        },
        {
          q: 'How do deposits and balance payments work?',
          a: 'Some bookings require a deposit to secure the service, with the balance due on a specified date or at check-in. If the balance deadline is missed, the booking may become at risk under the cancellation rules. Because the payment plan is included in the written confirmation, we recommend setting reminders.',
        },
        {
          q: 'In which currency are prices collected?',
          a: 'Products may be displayed in Turkish lira or in the relevant service currency. For foreign-currency products, exchange rates, bank commissions or card issuer practices on the collection date may create differences. The final collection currency is shown on the payment screen or agency confirmation.',
        },
        {
          q: 'Can I receive an invoice or receipt?',
          a: 'For invoicing, the correct name or company title, tax or identity number, tax office and address details must be provided. For mediated services, the supplier invoice and the agency service fee may be issued separately. Please send invoice requests during payment or promptly to {email}.',
        },
        {
          q: 'How is payment security handled?',
          a: 'Card transactions are processed through authorized payment infrastructures; the agency does not request sensitive card data in plain text. If you see a suspicious link, different payee name or unusual payment request, verify it by calling {phone} before paying. Never share one-time bank passwords with anyone.',
        },
        {
          q: 'Can the price change after payment is completed?',
          a: 'After final confirmation and collection, the price for the same service scope is fixed. Customer-initiated changes, guest count differences, tax or fee increases, carrier charges or mandatory supplier extras may affect the total. In such cases, the difference and reason are shared in writing.',
        },
      ],
    },
    {
      id: 'cancellation',
      title: 'Cancellation, refunds and force majeure',
      description:
        'Cancellation periods, no-show and unavoidable change principles for package tours, hotels, villas and other services.',
      items: [
        {
          q: 'What is the 30-day cancellation rule for package tours?',
          a: 'As a general principle, written cancellation requests for package tours made at least 30 days before departure are assessed for refund after deducting mandatory expenses and any collected deductions under the contract. Cancellations made within 30 days may be subject to higher supplier, carrier or contract deductions. The detailed provisions on /legal/cancellation apply.',
        },
        {
          q: 'How do hotel 15/7/3 day tiers apply?',
          a: 'Hotel cancellations may allow more flexible terms until 15, 7 or 3 days before arrival depending on property type, season, campaign and special dates. After those periods, the first night, a percentage or the full amount may be charged. Non-refundable, early booking or special campaign rates can have stricter rules.',
        },
        {
          q: 'What happens in a no-show?',
          a: 'A no-show means the customer does not attend the hotel, tour, boat, vehicle or carrier service at the start time without notice. The supplier may treat the service as used and no refund may be due. If delay or non-attendance becomes likely, inform both the agency and supplier in writing as soon as possible.',
        },
        {
          q: 'How long does a refund take?',
          a: 'The refund is processed through the original payment channel after cancellation conditions and supplier reconciliation are finalized. Bank and card network processing times are outside the agency’s control. International cards, installment transactions or foreign-currency collections may take longer to reflect.',
        },
        {
          q: 'Does force majeure create an automatic refund right?',
          a: 'Natural disasters, epidemics, official travel bans, security decisions, port closures or flight cancellations are evaluated according to the product type. Force majeure does not always mean an automatic full refund; carrier, hotel, local authority and contract rules apply together. Alternative dates, travel credit or partial refund options may be offered in writing.',
        },
        {
          q: 'How should I submit a cancellation request?',
          a: 'Cancellation or change requests must be submitted in writing to {email} or through the /contact form. Include the booking number, passenger name, service date and reason for cancellation. Phone calls may provide guidance, but the written record determines the processing date.',
        },
      ],
    },
    {
      id: 'hotels',
      title: 'Hotels and accommodation',
      description:
        'Hotel check-in and check-out, room usage, child policies and property rules.',
      items: [
        {
          q: 'What are hotel check-in and check-out times?',
          a: 'Check-in is usually in the afternoon and check-out is in the morning or before noon, but exact times depend on the property. Early check-in and late check-out are possible only with availability and property approval. These requests may be chargeable and are not guaranteed simply because they are noted.',
        },
        {
          q: 'Is the room type and bed setup guaranteed?',
          a: 'The purchased room type is guaranteed; details such as bed type, view, floor or connecting rooms are provided subject to property availability. If a feature is clearly sold on the product page, it is part of the booking. If a different room is assigned at check-in, notify reception and the agency immediately.',
        },
        {
          q: 'Why are child age and extra guest details important?',
          a: 'Hotels may apply different prices or acceptance rules according to child age, baby cot, extra bed and maximum capacity. Incorrect age declarations can create price differences or require a room change at check-in. All guests’ ages on the arrival date must be stated correctly during booking.',
        },
        {
          q: 'Can hotel concept and included services change?',
          a: 'Buffets, a la carte restaurants, beach, pool, spa, entertainment and seasonal facilities may change because of occupancy, weather and local rules. The product page should be read together with the operating conditions on your travel date. If a service is essential for you, request written confirmation before booking.',
        },
        {
          q: 'How do pet, smoking and property rules apply?',
          a: 'Pet acceptance, smoking areas, age limits, deposits, dress codes and visitor rules are the property’s own policies. The agency cannot change these rules. Breach of a rule may cause refusal of service, extra cleaning fees or deposit deductions.',
        },
        {
          q: 'What should I do if I have a problem at the hotel?',
          a: 'First report the issue to reception on the same day and request a solution. If it is not resolved, send photos, documents and a short explanation to {email} or call the reservation line. Problems reported for the first time after the trip may be assessed in a limited way because on-site solutions are no longer possible.',
        },
      ],
    },
    {
      id: 'villas',
      title: 'Villas and private stays',
      description:
        'Deposits, check-in procedure, damages, capacity and house rules for villa rentals.',
      items: [
        {
          q: 'Why is a deposit taken for villa bookings?',
          a: 'For villas, apartments and private stays, a deposit may be collected to secure damage, lost items, unusual cleaning or energy use. The deposit amount and payment method are stated on the product page or voucher. If there is no issue at check-out inspection, it is refunded according to the supplier’s rules.',
        },
        {
          q: 'How does villa check-in and key handover work?',
          a: 'The check-in time, meeting point and key handover are organized by the owner or local operations team. Identity notification, balance payment or deposit steps may be completed at arrival. If you will be late, inform the operations team in advance; late-night arrivals may incur extra fees.',
        },
        {
          q: 'Can I exceed the villa capacity?',
          a: 'The published maximum guest capacity cannot be exceeded because of safety, license and accommodation rules. All guests, including children and babies, must be declared in the booking. Undeclared guests may lead to extra charges, refusal of service or contract termination.',
        },
        {
          q: 'Who handles pool, garden and technical faults?',
          a: 'Private pool, jacuzzi, garden, internet, air-conditioning or utility systems may occasionally fail. If the supplier is notified promptly, repair or a reasonable alternative solution is sought. The agency cannot guarantee compensation for regional outages, weather conditions or public infrastructure failures.',
        },
        {
          q: 'Are villa cancellation rules different from hotels?',
          a: 'Yes. Villas have limited inventory and are reserved specifically for the guest, so deposits are often non-refundable or subject to stricter conditions. Season, arrival date and owner contract determine the cancellation cost. Review /legal/cancellation together with the product’s special terms before booking.',
        },
        {
          q: 'Can I hold a party, event or invite outside guests?',
          a: 'Parties, loud events, commercial shoots, wedding preparations or outside visitors require owner approval. Use without written permission may breach neighbor, security and licensing rules. If you plan such use, disclose the scope clearly before booking.',
        },
      ],
    },
    {
      id: 'tours',
      title: 'Tours and activities',
      description:
        'Package tours, daily excursions, guiding, minimum participant numbers and program changes.',
      items: [
        {
          q: 'Is the tour itinerary fixed?',
          a: 'Tour programs show the planned route, visits and service scope. Order and timing may change because of weather, traffic, permits, museum closures, security or operational reasons. Important changes affecting the main service scope are communicated whenever possible.',
        },
        {
          q: 'What if the minimum participant number is not reached?',
          a: 'Some group tours require a minimum number of participants. If the number is not reached, the tour may be cancelled, another date may be offered or a private tour option may be proposed with a price difference. If the cancellation is agency-driven, eligible collected amounts are refunded under the contract terms.',
        },
        {
          q: 'How are guiding language and meeting point determined?',
          a: 'The guiding language is stated on the product page or booking confirmation. The meeting point, time and contact details are included in the voucher or sent before the tour. If the guest is not ready at the meeting time, this may be treated as a no-show.',
        },
        {
          q: 'Which expenses are not included in tours?',
          a: 'Personal expenses, certain museum entrances, drinks, optional activities, tips and services not clearly listed as included are usually excluded. The included/excluded list is part of the product and should be read carefully. Local payments may require cash or a different currency.',
        },
        {
          q: 'Are there health, age or fitness requirements?',
          a: 'Tours involving walking, boats, diving, safari, rafting or long transfers may have age, health and mobility requirements. Pregnancy, chronic illness, disability or special assistance needs must be disclosed before booking. The supplier may refuse unsafe participation.',
        },
        {
          q: 'When will I see the package tour contract?',
          a: 'For services that qualify as package tours, the key services, price, cancellation rules and party details are shared before sale or during confirmation. Do not pay before reading the documents, and ask unclear points in writing. /legal/terms and /legal/cancellation also apply.',
        },
      ],
    },
    {
      id: 'yachts',
      title: 'Yachts, boats and blue cruises',
      description:
        'Yacht charter, routes, weather, captain decisions, ports and deposit processes.',
      items: [
        {
          q: 'Is the yacht route finalized with the booking?',
          a: 'The route is planned according to the vessel, duration, port, weather and local permits. The captain may change bays, ports or sailing order for safety reasons. Tell us any route expectations before booking so the right vessel and duration can be selected.',
        },
        {
          q: 'Is there a refund if weather changes the trip?',
          a: 'Sea and weather safety depend on the captain and competent authorities. Bad weather may shorten the route, move the boat to alternative bays or delay departure. Refund, postponement or alternative service rights are determined by the product contract and the service actually provided.',
        },
        {
          q: 'What is included in yacht charter?',
          a: 'The vessel, captain or crew, fuel allowance, cleaning, meals, drinks, port taxes and water sports vary by boat. Included and excluded services are stated in the offer or product page. Ask for written confirmation before payment if any item is unclear.',
        },
        {
          q: 'How do deposit and damage responsibility work?',
          a: 'Bareboat or private charters may require a damage deposit. Damage to equipment, lost items, unusual cleaning or use outside the contract may be deducted from the deposit. Attend handover and return checks and make sure any notes are recorded in writing.',
        },
        {
          q: 'Can I bring food and drinks on board?',
          a: 'Outside food and drinks, catering, menu changes or special celebration requests depend on the boat operator’s policy. Some vessels may charge service, cleaning or require a menu package. Allergies and dietary preferences should be stated before booking.',
        },
        {
          q: 'Who is responsible for ports, passports and international exits?',
          a: 'For international blue cruise routes, passports, visas, departure fees and port formalities are the guest’s responsibility; the agency may provide operational guidance. Failure to sail because of missing documents may be considered customer-caused. Check current official rules before travel.',
        },
      ],
    },
    {
      id: 'transport',
      title: 'Flights, ferries, transfers and carriers',
      description:
        'Carrier rules, ticket changes, luggage, delays, transfer waiting time and operational details.',
      items: [
        {
          q: 'Which rules apply to flight and ferry tickets?',
          a: 'For flights, ferries, buses and similar transport services, the relevant carrier’s fare, baggage, name change, cancellation and refund rules apply. The agency cannot change those rules and can only provide processing and information support. Penalties or service fees may arise after ticketing.',
        },
        {
          q: 'What if there is a name error on the ticket?',
          a: 'Names must match the identity document or passport. Spelling errors, missing middle names or surname changes may not be accepted by the carrier. Contact {email} immediately if you see an error; correction is possible only according to carrier rules and fees.',
        },
        {
          q: 'How is transfer waiting time calculated?',
          a: 'Waiting time depends on transfer type, airport arrival time, flight tracking and whether the vehicle is private or shared. Provide the correct flight number and inform the operations team of delays. Exceeding the included waiting time may create extra fees or loss of service.',
        },
        {
          q: 'Is luggage and special equipment acceptance guaranteed?',
          a: 'Baggage allowance depends on the carrier or transfer vehicle capacity. Strollers, sports equipment, wheelchairs, pets and excess baggage must be declared in advance. Undeclared special equipment may require an extra vehicle, extra fee or may be refused.',
        },
        {
          q: 'What is the agency’s role in carrier delays or cancellations?',
          a: 'Carrier delays, cancellations, route changes and operational disruptions are subject to the carrier’s liability rules. The agency supports research of alternatives, supplier communication and document sharing. Extra accommodation, new ticket or transfer costs are assessed under the product rules.',
        },
        {
          q: 'Can I change the route on a private transfer?',
          a: 'Private transfers are priced for the agreed start and end points. Stops, route extensions, waiting or a different address require operational approval and may create extra charges. Instead of asking the driver for a service outside the contract, inform the agency operations line.',
        },
      ],
    },
    {
      id: 'visa',
      title: 'Visa, passport and travel documents',
      description:
        'Limits of visa advice, consular decisions, document responsibility and entry rules.',
      items: [
        {
          q: 'Is {agency} a visa center?',
          a: '{agency} is a travel agency; unless a visa product is expressly sold, it does not act as an official visa application center or consular representative. We may provide general document guidance related to travel products. The final decision always belongs to the consulate, border police or competent public authority.',
        },
        {
          q: 'Will I receive a refund if my visa is refused?',
          a: 'Visa refusal does not automatically remove the product’s cancellation rules. Hotel, tour, ticket or carrier conditions apply as written, and non-refundable services may be deducted. If visa risk exists, choose flexible products and apply early.',
        },
        {
          q: 'Who is responsible for passport validity?',
          a: 'Passport validity, blank pages, damage, old document types, child consent and identity suitability are the traveler’s responsibility. Many countries require a passport valid for at least six months after travel. Check official sources before finalizing the booking.',
        },
        {
          q: 'Is visa information from the agency binding?',
          a: 'Information provided by the agency is general guidance and does not replace official decisions. Visa type, document list, appointment timing, biometrics and fees vary by country and personal circumstances. Official sources, consulates and authorized application channels always take priority.',
        },
        {
          q: 'Is travel insurance enough for a visa?',
          a: 'Travel health insurance may be mandatory for many visa applications, but it does not guarantee visa approval. Coverage limits, country scope and dates must meet application requirements. Check the destination country’s current rules before buying a policy.',
        },
        {
          q: 'What if I cannot travel because of missing documents?',
          a: 'Missing visa, passport, ID, vaccination certificate, parental consent or entry form may be considered traveler-caused. If a carrier or border officer refuses travel for this reason, no refund may be due. You may ask the agency for guidance, but final document control remains the traveler’s responsibility.',
        },
      ],
    },
    {
      id: 'account',
      title: 'Account, access and security',
      description:
        'User account, contact details, password security, unauthorized transactions and notifications.',
      items: [
        {
          q: 'Is creating an account mandatory?',
          a: 'Some products may allow quick requests without an account, but using an account is recommended for booking tracking, document access and support history. Keeping account details current helps operational communication. Update e-mail or phone changes without delay.',
        },
        {
          q: 'How should I protect my password and account?',
          a: 'Use a strong and unique password, and do not share passwords or verification codes. Sign out on shared devices and manage browser-saved card or password details carefully. If you notice suspicious access, contact our support channels immediately.',
        },
        {
          q: 'Who is responsible for actions made through my account?',
          a: 'Booking requests, information changes and messages sent through your account may be treated as your actions. If unauthorized use is suspected, notify us in writing as soon as possible. Losses before notification are assessed according to the event and security records.',
        },
        {
          q: 'What happens if my contact details are wrong?',
          a: 'Incorrect e-mail or phone details may prevent you from receiving vouchers, payment reminders, operational changes or cancellation notices. Delays and loss of rights caused by this may be the customer’s responsibility. Check your contact details before booking and near the travel date.',
        },
        {
          q: 'Can I delete my account or booking history?',
          a: 'You may submit access, correction, deletion or restriction requests under personal data rights. Some records may need to be retained for invoices, contracts, disputes and legal retention obligations. Details are explained on /legal/privacy.',
        },
        {
          q: 'What should I do if I suspect fraud?',
          a: 'Do not pay if you receive a suspicious message, fake payment link or different IBAN claiming to be from {brand}. Request verification through {phone}, {phone2} or {email}. Our official website is {site}; do not share personal or card data through links you do not trust.',
        },
      ],
    },
    {
      id: 'privacy',
      title: 'KVKK, privacy and cookies',
      description:
        'Processing, sharing and retention of personal data, cookies and communication permissions.',
      items: [
        {
          q: 'Which personal data is processed?',
          a: 'During booking and support processes, we may process name, contact details, identity or passport details, travel preferences, payment transaction information and request correspondence. The data varies by product type. The scope and legal grounds are detailed on /legal/privacy.',
        },
        {
          q: 'With whom is my data shared?',
          a: 'To provide the service, necessary data may be shared with hotels, villa owners, tour operators, carriers, payment institutions, insurers, technology providers and competent public authorities. Sharing is limited to booking performance and legal obligations. Unnecessary data transfer is avoided.',
        },
        {
          q: 'How can I exercise my KVKK rights?',
          a: 'You can send requests for access, correction, deletion, objection to processing and other legal rights through {email}. The request must include information that allows identity verification. Applications are evaluated within the periods required by law.',
        },
        {
          q: 'Why are cookies used?',
          a: 'Cookies are used to run the site, provide security, remember preferences, measure performance and, where permitted, improve marketing experience. Strictly necessary cookies are required for the service to work. Preferences and details are available on /legal/cookies.',
        },
        {
          q: 'Can I opt out of marketing messages?',
          a: 'You may withdraw commercial electronic communication permissions at any time. Mandatory notices directly related to a booking may still be sent independently of marketing consent. Use the method in the message or write to {email}.',
        },
        {
          q: 'Are my payment details stored?',
          a: 'Card transactions are processed through authorized payment infrastructures, and card security details are not stored by the agency in plain text. Transaction references, collection results and accounting records may be retained for legal obligations. Contact your bank and the agency immediately if you suspect a security issue.',
        },
      ],
    },
    {
      id: 'partners',
      title: 'Suppliers and agency partners',
      description:
        'Partnership applications and quality expectations for hotels, villas, tours, transfers, yachts and agencies.',
      items: [
        {
          q: 'How can I list my product on {brand}?',
          a: 'For hotels, villas, tours, yachts, transfers or similar travel products, send your partnership request through /contact or to {email}. Include company details, licenses or authorization documents, product description, pricing model, visuals and operational contacts. Our team will contact you after suitability review.',
        },
        {
          q: 'Which documents are requested from suppliers?',
          a: 'Depending on product type, we may request tax documents, activity certificates, tourism operation certificates, vessel licenses, insurance, transport authorization, chamber registration or documents proving contract authority. Documents must be current and verifiable. Products may not be published with missing documentation.',
        },
        {
          q: 'What are the content and visual quality standards?',
          a: 'Visitor-facing texts must be accurate, current, natural and not misleading. Visuals must belong to the relevant product and represent the room, villa, vessel or tour experience truthfully. Incorrect visuals, exaggerated promises or missing rule disclosure may lead to removal from publication.',
        },
        {
          q: 'How are price and availability managed?',
          a: 'The supplier is responsible for keeping prices, allotment, seasons, closed dates and special conditions current. If wrong price or availability causes customer harm, responsibility is assessed under contract terms. Critical changes must be notified to the agency promptly in writing.',
        },
        {
          q: 'Can agencies cooperate with {brand}?',
          a: 'Cooperation with authorized travel agencies, corporate sales teams and destination specialists may be evaluated. Commission, brand use, customer communication and payment flow are determined by written agreement. Agency certificate number and authorized contact details should be included in the application.',
        },
        {
          q: 'How are customer complaints reflected to suppliers?',
          a: 'Customer complaints are forwarded to suppliers with documents, dates, booking records and operational notes. We expect a reasonable explanation and solution within a fair time. Repeated complaints, verified service gaps or misleading information may cause product suspension.',
        },
      ],
    },
  ],
}
