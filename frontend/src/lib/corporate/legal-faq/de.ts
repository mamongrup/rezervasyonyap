import type { LegalFaqBundle } from './types'

export const de: LegalFaqBundle = {
  metaTitle: 'Häufig gestellte Fragen | Rezervasyon Yap',
  metaDescription:
    'Fragen zu Buchung, Zahlung, Stornierung, Hotels, Villen, Touren, Yachten, Transport, Visa, Datenschutz und Partnern für Rezervasyon Yap und Mamon Plus Travel Agency.',
  pageTitle: 'Rechtliche und operative häufig gestellte Fragen',
  pageLead:
    'Hier finden Sie die wichtigsten Informationen zu Unternehmensdaten, Buchungsablauf, Zahlung, Stornierung, Unterkunft, Touren, Transport, Visa, Kontosicherheit und personenbezogenen Daten, wenn Sie Ihre Reise mit {brand} planen.',
  categoriesHeading: 'Themen',
  backToCategories: 'Zurück zu den Kategorien',
  openCategory: 'Kategorie öffnen',
  questionsCount: '{count} Fragen',
  categories: [
    {
      id: 'general',
      title: 'Allgemeine Informationen und Unternehmensidentität',
      description:
        '{brand} ist die Online-Buchungsplattform von {agency} und bietet Reiseleistungen transparent über eine Reiseagentur an.',
      items: [
        {
          q: 'Welches Unternehmen betreibt {brand}?',
          a: '{brand} wird von {legalName} betrieben. Reiseagenturleistungen erfolgen unter dem Namen {agency}; die Agentur ist als {tursab} registriert. Unsere Anschrift lautet {address}; Sie erreichen uns über {email}, {phone}, {phone2} sowie über die Büroanschlüsse {officePhones}.',
        },
        {
          q: 'Sind die Angaben auf der Website ein verbindliches offizielles Angebot?',
          a: 'Preise, Verfügbarkeiten, Programme und Bilder auf der Website beruhen auf Lieferantendaten und redaktioneller Prüfung zum Zeitpunkt der Anfrage. Der endgültige Leistungsumfang, Zahlungsbedingungen und besondere Hinweise werden in der Buchungsbestätigung oder im Vertragsbereich festgelegt. Bei entscheidenden Details empfehlen wir eine schriftliche Bestätigung über /contact.',
        },
        {
          q: 'Für welche Reiseprodukte vermittelt {agency} Leistungen?',
          a: 'Wir können Hotels, Villen, Pauschalreisen, Tagesausflüge, Yachtcharter, Transfers, Flüge, Fähren und weitere angefragte Reiseleistungen vermitteln oder organisieren. Jedes Produkt kann eigene Anbieter, Betriebsabläufe und Stornoregeln haben. Lesen Sie daher die Produktseite zusammen mit /legal/terms und /legal/cancellation.',
        },
        {
          q: 'Wie kann ich die Agentur vor der Buchung kontaktieren?',
          a: 'Sie können an {email} schreiben, die Reservierungsnummern {phone} und {phone2} anrufen oder das Formular unter /contact nutzen. In stark nachgefragten Zeiten werden schriftliche Anfragen nach Eingangsreihenfolge bearbeitet. Bei nahen Reisedaten beschleunigen Produktname, Datum, Personenzahl und Telefonnummer die Prüfung.',
        },
        {
          q: 'Wie entstehen die Inhalte auf der Plattform?',
          a: 'Produkttexte werden aus Anbieterinformationen, Vertragsbedingungen und redaktionellen Kontrollen erstellt. Die für Besucher sichtbaren Texte sollen verständlich, aktuell und nicht irreführend sein; Änderungen durch Hotels, Transportunternehmen, Bootseigner oder lokale Behörden sind dennoch möglich. Vor wichtigen Entscheidungen sollte der aktuelle Leistungsumfang bestätigt werden.',
        },
        {
          q: 'Welche rechtlichen Texte sollte ich lesen?',
          a: 'Für Nutzungs- und Verkaufsbedingungen lesen Sie /legal/terms, für Storno und Rückerstattung /legal/cancellation, für personenbezogene Daten /legal/privacy und für Cookie-Einstellungen /legal/cookies. Diese Texte gelten gemeinsam mit produktspezifischen Bedingungen. Eine ausdrücklich genannte Sonderbedingung kann für das jeweilige Produkt Vorrang haben.',
        },
      ],
    },
    {
      id: 'booking',
      title: 'Buchungsprozess',
      description:
        'Die Schritte von Suche, Angebot, Vorbestätigung, Zahlung und endgültiger Buchung.',
      items: [
        {
          q: 'Wie erstelle ich eine Buchung?',
          a: 'Wählen Sie ein Produkt und geben Sie Datum, Personenzahl, Zimmer- oder Leistungsart und weitere angeforderte Angaben ein. Das System kann Verfügbarkeit und Preis anzeigen; bei manchen Produkten ist eine Bestätigung durch Agentur oder Anbieter nötig. Nach Zahlung oder erforderlicher Anzahlung erhalten Sie die bestätigten Buchungsdaten über Ihre Kontaktkanäle.',
        },
        {
          q: 'Ist jede Anfrage automatisch eine feste Buchung?',
          a: 'Nein. Besonders bei Villen, Yachten, Gruppentouren, privaten Transfers und dynamisch bepreisten Unterkünften kann zuerst eine Verfügbarkeitsprüfung erfolgen. Eine feste Buchung entsteht erst, wenn die Zahlungsbedingungen erfüllt sind und die Agentur den Service bestätigt. Vorher gebuchte Nebenleistungen erfolgen auf eigenes Risiko.',
        },
        {
          q: 'Welche Angaben muss ich vor der Bestätigung kontrollieren?',
          a: 'Namen, Ausweis- oder Passdaten, Reisedaten, Personenzahl, Altersgruppen, Zimmerart und Sonderwünsche müssen sorgfältig geprüft werden. Falsche oder fehlende Angaben können Zusatzkosten, Leistungsverweigerung oder Probleme bei Beförderern verursachen. Melden Sie Fehler sofort an {email}.',
        },
        {
          q: 'Sind Sonderwünsche garantiert?',
          a: 'Babybett, verbundene Zimmer, höhere Etage, früher Check-in, besondere Verpflegung, Yachtstrecke oder Transferwartezeit werden an den Anbieter weitergegeben. Verbindlich sind sie nur, wenn der Anbieter sie schriftlich bestätigt. Kostenpflichtige oder verfügbarkeitsabhängige Wünsche können eine gesonderte Freigabe erfordern.',
        },
        {
          q: 'Wann erhalte ich meine Buchungsunterlagen?',
          a: 'Bei bestätigten Buchungen werden Voucher, Vertragszusammenfassung, Zahlungsinformationen oder operative Hinweise elektronisch zugesandt. Bei einigen Leistungen folgen Treffpunkt, Reiseleiterdaten oder Kapitänskontakt erst kurz vor Reisebeginn. Bewahren Sie die Unterlagen auf und halten Sie sie beim Leistungsbeginn bereit.',
        },
        {
          q: 'Kann ich meine Buchung ändern?',
          a: 'Änderungen von Datum, Namen, Personenzahl oder Leistungsumfang hängen von Produktregeln, Anbieterfreigabe und Verfügbarkeit ab. Dabei können Gebühren, Preisunterschiede oder neu angewendete Stornobedingungen entstehen. Je früher und schriftlicher Sie anfragen, desto geringer ist das Risiko von Rechtsverlusten.',
        },
      ],
    },
    {
      id: 'payment',
      title: 'Zahlung, Sicherheit und Rechnung',
      description:
        'Zahlungsarten, Einzug, Währungsdifferenzen, Rechnungen und sichere Transaktionen.',
      items: [
        {
          q: 'Welche Zahlungsarten sind möglich?',
          a: 'Je nach Produkt können Kreditkarte, Banküberweisung, virtuelles POS, Ratenzahlung oder andere von der Agentur mitgeteilte sichere Kanäle genutzt werden. Methode und Frist stehen auf der Produktseite oder in der Buchungsbestätigung. Zahlen Sie nicht auf private Konten oder über ungeprüfte Links außerhalb des offiziellen Kanals.',
        },
        {
          q: 'Wie funktionieren Anzahlung und Restzahlung?',
          a: 'Bei einigen Buchungen wird zur Sicherung der Leistung eine Anzahlung fällig; der Restbetrag ist zu einem bestimmten Datum oder beim Check-in zu zahlen. Wird die Frist versäumt, kann die Buchung nach den Stornoregeln gefährdet sein. Da der Zahlungsplan schriftlich bestätigt wird, sind Kalendererinnerungen sinnvoll.',
        },
        {
          q: 'In welcher Währung wird abgerechnet?',
          a: 'Preise können in Türkischer Lira oder in der für die Leistung relevanten Währung angezeigt werden. Bei Fremdwährungen können Tageskurs, Bankgebühren oder Kartenanbieterregelungen Unterschiede verursachen. Die endgültige Einzugswährung wird im Zahlungsbereich oder in der Agenturbestätigung genannt.',
        },
        {
          q: 'Kann ich eine Rechnung oder Quittung erhalten?',
          a: 'Für Rechnungen benötigen wir korrekte Angaben zu Name oder Firma, Steuer- oder Identnummer, Finanzamt und Adresse. Bei vermittelten Leistungen können Anbieterrechnung und Agenturservicegebühr getrennt ausgestellt werden. Rechnungswünsche sollten während der Zahlung oder zeitnah an {email} gesendet werden.',
        },
        {
          q: 'Wie wird die Zahlungssicherheit gewährleistet?',
          a: 'Kartenzahlungen laufen über autorisierte Zahlungsinfrastrukturen; sensible Kartendaten werden von der Agentur nicht im Klartext angefordert. Bei verdächtigen Links, abweichendem Zahlungsempfänger oder ungewöhnlichen Zahlungswünschen rufen Sie vorab {phone} zur Bestätigung an. Einmalpasswörter Ihrer Bank dürfen Sie niemals weitergeben.',
        },
        {
          q: 'Kann sich der Preis nach abgeschlossener Zahlung ändern?',
          a: 'Nach endgültiger Bestätigung und Zahlung ist der Preis für denselben Leistungsumfang fixiert. Kundenveranlasste Änderungen, geänderte Personenzahl, Steuer- oder Gebührenerhöhungen, Befördererentgelte oder verpflichtende Anbieterleistungen können den Betrag beeinflussen. Gründe und Differenzen werden schriftlich erläutert.',
        },
      ],
    },
    {
      id: 'cancellation',
      title: 'Stornierung, Rückerstattung und höhere Gewalt',
      description:
        'Fristen, No-show und unvermeidbare Änderungen bei Pauschalreisen, Hotels, Villen und anderen Leistungen.',
      items: [
        {
          q: 'Was bedeutet die 30-Tage-Regel bei Pauschalreisen?',
          a: 'Bei Pauschalreisen werden schriftliche Stornierungen mindestens 30 Tage vor Reisebeginn grundsätzlich nach Abzug zwingender Kosten und vertraglicher Abzüge auf Erstattung geprüft. Innerhalb von 30 Tagen können Anbieter-, Beförderer- und Vertragsbedingungen höhere Abzüge vorsehen. Maßgeblich sind die Details unter /legal/cancellation.',
        },
        {
          q: 'Wie gelten die Hotelstufen 15/7/3 Tage?',
          a: 'Bei Hotels können je nach Unterkunftsart, Saison, Aktion und Sondertermin flexiblere Bedingungen bis 15, 7 oder 3 Tage vor Anreise gelten. Danach können die erste Nacht, ein Prozentsatz oder der Gesamtpreis berechnet werden. Nicht erstattbare, Frühbucher- oder Sonderaktionspreise können strengere Regeln haben.',
        },
        {
          q: 'Was passiert bei No-show?',
          a: 'No-show bedeutet, dass der Kunde ohne rechtzeitige Mitteilung nicht im Hotel, bei der Tour, am Boot, Fahrzeug oder beim Beförderer erscheint. Der Anbieter kann die Leistung als genutzt ansehen, sodass kein Erstattungsanspruch entsteht. Bei Verzögerung oder Ausfallrisiko sollten Agentur und Anbieter sofort schriftlich informiert werden.',
        },
        {
          q: 'Wie lange dauert eine Rückerstattung?',
          a: 'Die Rückzahlung wird nach Klärung der Stornobedingungen und Anbieterabrechnung über den ursprünglichen Zahlungskanal veranlasst. Bearbeitungszeiten von Banken und Kartensystemen liegen außerhalb der Kontrolle der Agentur. Auslandskarten, Ratenzahlungen oder Fremdwährungen können länger dauern.',
        },
        {
          q: 'Führt höhere Gewalt automatisch zu voller Erstattung?',
          a: 'Naturereignisse, Epidemien, offizielle Reiseverbote, Sicherheitsentscheidungen, Hafenschließungen oder Flugausfälle werden nach Produktart bewertet. Höhere Gewalt bedeutet nicht immer automatische volle Erstattung; Beförderer-, Hotel-, Behörden- und Vertragsregeln gelten zusammen. Ersatztermine, Guthaben oder Teilrückzahlungen können schriftlich angeboten werden.',
        },
        {
          q: 'Wie muss ich eine Stornierung einreichen?',
          a: 'Storno- oder Änderungswünsche müssen schriftlich an {email} oder über /contact übermittelt werden. Nennen Sie Buchungsnummer, Namen, Leistungsdatum und Stornogrund. Telefonate können informieren, maßgeblich für den Bearbeitungszeitpunkt ist jedoch der schriftliche Nachweis.',
        },
      ],
    },
    {
      id: 'hotels',
      title: 'Hotels und Unterkunft',
      description:
        'Check-in, Check-out, Zimmernutzung, Kinderregeln und Hausordnung von Unterkünften.',
      items: [
        {
          q: 'Welche Check-in- und Check-out-Zeiten gelten?',
          a: 'Der Check-in liegt meist am Nachmittag, der Check-out am Vormittag oder vor Mittag; genaue Zeiten hängen vom Hotel ab. Früher Check-in und später Check-out sind nur nach Verfügbarkeit und Zustimmung möglich. Sie können kostenpflichtig sein und sind durch einen Hinweis in der Buchung nicht garantiert.',
        },
        {
          q: 'Sind Zimmerart und Bettenanordnung garantiert?',
          a: 'Die gebuchte Zimmerkategorie ist garantiert; Bettart, Aussicht, Etage oder Verbindungstür hängen von der Verfügbarkeit des Hotels ab. Eine ausdrücklich verkaufte Eigenschaft auf der Produktseite gehört zum Buchungsumfang. Bei abweichender Zuteilung informieren Sie sofort Rezeption und Agentur.',
        },
        {
          q: 'Warum sind Kinderalter und Zusatzpersonen wichtig?',
          a: 'Hotels können je nach Kinderalter, Babybett, Zustellbett und Maximalbelegung unterschiedliche Preise oder Annahmeregeln anwenden. Falsche Altersangaben können beim Check-in Preisunterschiede oder Zimmerwechsel verursachen. Alle Gäste müssen mit ihrem Alter am Anreisetag korrekt angegeben werden.',
        },
        {
          q: 'Können Hotelkonzept und eingeschlossene Leistungen wechseln?',
          a: 'Buffet, À-la-carte-Restaurant, Strand, Pool, Spa, Animation und saisonale Einrichtungen können sich wegen Auslastung, Wetter oder lokalen Regeln ändern. Die Produktseite ist zusammen mit den Bedingungen am Reisedatum zu verstehen. Wenn eine Leistung entscheidend ist, holen Sie vor der Buchung eine schriftliche Bestätigung ein.',
        },
        {
          q: 'Wie gelten Haustier-, Rauch- und Hotelregeln?',
          a: 'Haustierannahme, Raucherbereiche, Altersgrenzen, Kautionen, Kleidungsvorschriften und Besucherregeln sind eigene Regeln der Unterkunft. Die Agentur kann sie nicht ändern. Verstöße können Leistungsverweigerung, Reinigungsgebühren oder Kautionsabzüge auslösen.',
        },
        {
          q: 'Was soll ich bei einem Problem im Hotel tun?',
          a: 'Melden Sie das Problem zuerst am selben Tag an der Rezeption und verlangen Sie eine Lösung. Wird es nicht gelöst, senden Sie Fotos, Unterlagen und eine kurze Beschreibung an {email} oder rufen Sie die Reservierung an. Nach Reiseende erstmals gemeldete Probleme können nur eingeschränkt bewertet werden.',
        },
      ],
    },
    {
      id: 'villas',
      title: 'Villen und private Unterkünfte',
      description:
        'Kaution, Anreise, Schäden, Kapazität und Hausregeln bei Villenmieten.',
      items: [
        {
          q: 'Warum wird bei Villen eine Kaution erhoben?',
          a: 'Bei Villen, Apartments und privaten Unterkünften kann eine Kaution für Schäden, verlorene Gegenstände, außergewöhnliche Reinigung oder Energieverbrauch verlangt werden. Höhe und Zahlungsweise stehen auf der Produktseite oder im Voucher. Wenn die Abnahmekontrolle ohne Beanstandung verläuft, wird sie nach Anbieterregel erstattet.',
        },
        {
          q: 'Wie erfolgen Check-in und Schlüsselübergabe?',
          a: 'Ankunftszeit, Treffpunkt und Schlüsselübergabe werden vom Eigentümer oder lokalen Operationsteam organisiert. Identitätsmeldung, Restzahlung oder Kaution können bei Anreise erledigt werden. Bei Verspätung muss das Team vorher informiert werden; späte Anreisen können zusätzliche Kosten verursachen.',
        },
        {
          q: 'Darf ich die Villenkapazität überschreiten?',
          a: 'Die angegebene maximale Personenzahl darf aus Sicherheits-, Lizenz- und Unterkunftsgründen nicht überschritten werden. Kinder und Babys zählen ebenfalls und müssen in der Buchung genannt werden. Nicht gemeldete Personen können Zusatzgebühren, Leistungsverweigerung oder Vertragsauflösung auslösen.',
        },
        {
          q: 'Wer kümmert sich um Pool-, Garten- oder Technikprobleme?',
          a: 'Bei Privatpool, Whirlpool, Garten, Internet, Klimaanlage oder Strom- und Wassersystemen können Störungen auftreten. Bei rechtzeitiger Meldung bemüht sich der Anbieter um Reparatur oder eine angemessene Alternative. Für regionale Ausfälle, Wetter oder öffentliche Infrastruktur kann die Agentur keine Entschädigung garantieren.',
        },
        {
          q: 'Sind Villenstornos anders als Hotelstornos?',
          a: 'Ja. Villen sind begrenzt verfügbar und werden individuell für den Gast reserviert; Anzahlungen sind daher häufig nicht erstattbar oder strengeren Regeln unterworfen. Saison, Anreisedatum und Eigentümervertrag bestimmen die Kosten. Lesen Sie /legal/cancellation und die Sonderbedingungen des Produkts vor der Buchung.',
        },
        {
          q: 'Sind Partys, Veranstaltungen oder externe Gäste erlaubt?',
          a: 'Partys, laute Veranstaltungen, kommerzielle Aufnahmen, Hochzeitsvorbereitungen oder externe Besucher benötigen die Zustimmung des Eigentümers. Ohne schriftliche Erlaubnis können Nachbarschafts-, Sicherheits- und Lizenzregeln verletzt werden. Teilen Sie solche Pläne vor der Buchung klar mit.',
        },
      ],
    },
    {
      id: 'tours',
      title: 'Touren und Aktivitäten',
      description:
        'Pauschalreisen, Tagesausflüge, Reiseleitung, Mindestteilnehmer und Programmänderungen.',
      items: [
        {
          q: 'Ist das Tourprogramm verbindlich festgelegt?',
          a: 'Tourprogramme zeigen geplante Route, Besuche und Leistungsumfang. Reihenfolge und Zeiten können sich wegen Wetter, Verkehr, Genehmigungen, Museumsschließungen, Sicherheit oder operativen Gründen ändern. Wesentliche Änderungen des Hauptleistungsumfangs werden soweit möglich vorher mitgeteilt.',
        },
        {
          q: 'Was geschieht, wenn die Mindestteilnehmerzahl nicht erreicht wird?',
          a: 'Einige Gruppentouren sind an eine Mindestteilnehmerzahl gebunden. Wird sie nicht erreicht, kann die Tour storniert, ein anderer Termin angeboten oder eine private Tour gegen Aufpreis vorgeschlagen werden. Erfolgt die Absage durch die Agentur, werden geeignete bereits gezahlte Beträge nach Vertrag erstattet.',
        },
        {
          q: 'Wie werden Sprache der Reiseleitung und Treffpunkt festgelegt?',
          a: 'Die Sprache der Reiseleitung steht auf der Produktseite oder in der Buchungsbestätigung. Treffpunkt, Uhrzeit und Kontakt werden im Voucher oder vor der Tour mitgeteilt. Ist der Gast zur Treffzeit nicht bereit, kann dies als No-show gelten.',
        },
        {
          q: 'Welche Ausgaben sind bei Touren nicht enthalten?',
          a: 'Persönliche Ausgaben, manche Museumseintritte, Getränke, optionale Aktivitäten, Trinkgelder und nicht ausdrücklich eingeschlossene Leistungen sind meist ausgeschlossen. Die Liste der eingeschlossenen und ausgeschlossenen Leistungen ist Bestandteil des Produkts. Lokale Zahlungen können Bargeld oder andere Währungen erfordern.',
        },
        {
          q: 'Gibt es Gesundheits-, Alters- oder Fitnessvorgaben?',
          a: 'Touren mit Wanderungen, Booten, Tauchen, Safari, Rafting oder langen Transfers können Alters-, Gesundheits- und Mobilitätsanforderungen haben. Schwangerschaft, chronische Erkrankung, Behinderung oder Unterstützungsbedarf müssen vor der Buchung gemeldet werden. Der Anbieter kann unsichere Teilnahme ablehnen.',
        },
        {
          q: 'Wann sehe ich den Pauschalreisevertrag?',
          a: 'Bei Leistungen mit Pauschalreisecharakter werden Hauptleistungen, Preis, Stornoregeln und Parteidaten vor dem Verkauf oder während der Bestätigung bereitgestellt. Zahlen Sie nicht, bevor Sie die Dokumente gelesen haben, und stellen Sie unklare Fragen schriftlich. Zusätzlich gelten /legal/terms und /legal/cancellation.',
        },
      ],
    },
    {
      id: 'yachts',
      title: 'Yachten, Boote und Blaue Reise',
      description:
        'Yachtcharter, Routen, Wetter, Kapitänsentscheidungen, Häfen und Kautionen.',
      items: [
        {
          q: 'Ist die Yachtstrecke mit der Buchung endgültig?',
          a: 'Die Route wird nach Boot, Dauer, Hafen, Wetter und lokalen Genehmigungen geplant. Der Kapitän darf Buchten, Häfen oder die Fahrtreihenfolge aus Sicherheitsgründen ändern. Teilen Sie besondere Routenerwartungen vor der Buchung mit, damit Boot und Dauer passend gewählt werden können.',
        },
        {
          q: 'Gibt es Erstattung, wenn das Wetter die Fahrt verändert?',
          a: 'Sicherheit auf See und Wetterbeurteilung liegen beim Kapitän und den zuständigen Behörden. Schlechtes Wetter kann die Route verkürzen, Ausweichbuchten erfordern oder die Abfahrt verschieben. Erstattung, Verschiebung oder Ersatzleistung richten sich nach Produktvertrag und tatsächlich erbrachter Leistung.',
        },
        {
          q: 'Was ist bei einer Yachtmiete enthalten?',
          a: 'Boot, Kapitän oder Crew, Treibstofflimit, Reinigung, Mahlzeiten, Getränke, Hafengebühren und Wassersport variieren je nach Yacht. Eingeschlossene und ausgeschlossene Leistungen stehen im Angebot oder auf der Produktseite. Unklare Punkte sollten vor Zahlung schriftlich bestätigt werden.',
        },
        {
          q: 'Wie funktionieren Kaution und Schadenshaftung?',
          a: 'Bei Bareboat- oder privaten Charterleistungen kann eine Schadenskaution verlangt werden. Schäden an Ausrüstung, verlorene Gegenstände, außergewöhnliche Reinigung oder vertragswidrige Nutzung können von der Kaution abgezogen werden. Nehmen Sie an Übergabe und Rückgabe teil und lassen Sie Hinweise schriftlich festhalten.',
        },
        {
          q: 'Darf ich Essen und Getränke mit an Bord bringen?',
          a: 'Externe Speisen und Getränke, Catering, Menüänderungen oder besondere Feierwünsche hängen von der Politik des Bootsbetriebs ab. Manche Boote verlangen Service- oder Reinigungsgebühren oder ein Menüpaket. Allergien und Ernährungswünsche müssen vor der Buchung gemeldet werden.',
        },
        {
          q: 'Wer ist für Hafen-, Pass- und Ausreiseformalitäten verantwortlich?',
          a: 'Bei internationalen Routen sind Reisepass, Visum, Ausreisegebühr und Hafenformalitäten Verantwortung des Gastes; die Agentur kann operative Hinweise geben. Fehlende Dokumente, die die Ausfahrt verhindern, können als kundenverursacht gelten. Prüfen Sie vor Reisebeginn die aktuellen offiziellen Regeln.',
        },
      ],
    },
    {
      id: 'transport',
      title: 'Flüge, Fähren, Transfers und Beförderung',
      description:
        'Befördererregeln, Ticketänderungen, Gepäck, Verspätungen, Transferwartezeit und operative Informationen.',
      items: [
        {
          q: 'Welche Regeln gelten für Flug- und Fährtickets?',
          a: 'Bei Flügen, Fähren, Bussen und ähnlichen Transportleistungen gelten Tarif-, Gepäck-, Namensänderungs-, Storno- und Erstattungsregeln des jeweiligen Beförderers. Die Agentur kann diese Regeln nicht ändern, sondern nur bei Bearbeitung und Information unterstützen. Nach Ticketausstellung können Strafen oder Servicegebühren entstehen.',
        },
        {
          q: 'Was mache ich bei einem Namensfehler im Ticket?',
          a: 'Namen müssen mit Ausweis oder Reisepass übereinstimmen. Schreibfehler, fehlende Zweitnamen oder geänderte Nachnamen werden vom Beförderer möglicherweise nicht akzeptiert. Melden Sie Fehler sofort an {email}; Korrekturen sind nur nach Regel und Gebühr des Beförderers möglich.',
        },
        {
          q: 'Wie wird die Wartezeit beim Transfer berechnet?',
          a: 'Die Wartezeit hängt von Transferart, Flughafenankunft, Flugverfolgung und privater oder geteilter Fahrzeugnutzung ab. Geben Sie die richtige Flugnummer an und informieren Sie das Operationsteam über Verspätungen. Überschreiten der inkludierten Wartezeit kann Zusatzkosten oder Leistungsverlust verursachen.',
        },
        {
          q: 'Sind Gepäck und Sonderausrüstung garantiert erlaubt?',
          a: 'Gepäck hängt von Befördererregel oder Fahrzeugkapazität ab. Kinderwagen, Sportgeräte, Rollstuhl, Haustier oder Übergepäck müssen vorher gemeldet werden. Nicht gemeldete Sonderausrüstung kann ein Zusatzfahrzeug, Gebühren oder Ablehnung erfordern.',
        },
        {
          q: 'Welche Rolle hat die Agentur bei Verspätung oder Ausfall?',
          a: 'Verspätungen, Ausfälle, Routenänderungen und Betriebsstörungen von Beförderern unterliegen deren Haftungsregeln. Die Agentur unterstützt bei Alternativsuche, Anbieterkommunikation und Dokumentenweitergabe. Zusätzliche Unterkunft, neue Tickets oder Transfers werden nach Produktregeln bewertet.',
        },
        {
          q: 'Kann ich bei einem privaten Transfer die Route ändern?',
          a: 'Private Transfers werden für vereinbarten Start- und Zielpunkt kalkuliert. Zwischenstopps, Streckenverlängerung, Wartezeit oder andere Adresse benötigen operative Zustimmung und können Zusatzkosten auslösen. Bitten Sie nicht den Fahrer um vertragsfremde Leistungen, sondern informieren Sie die Agentur.',
        },
      ],
    },
    {
      id: 'visa',
      title: 'Visa, Pass und Reisedokumente',
      description:
        'Grenzen der Visaberatung, Konsulatsentscheidungen, Dokumentenverantwortung und Einreiseregeln.',
      items: [
        {
          q: 'Ist {agency} ein Visazentrum?',
          a: '{agency} ist eine Reiseagentur; sofern nicht ausdrücklich ein Visaprodukt verkauft wird, handelt sie nicht als offizielles Visumantragszentrum oder Konsulatsvertretung. Wir können allgemeine Hinweise zu Dokumenten im Zusammenhang mit Reiseleistungen geben. Die endgültige Entscheidung trifft immer Konsulat, Grenzpolizei oder zuständige Behörde.',
        },
        {
          q: 'Erhalte ich bei Visumablehnung eine Rückerstattung?',
          a: 'Eine Visumablehnung hebt die Stornoregeln des Produkts nicht automatisch auf. Es gelten Hotel-, Tour-, Ticket- oder Befördererbedingungen; bei nicht erstattbaren Leistungen können Abzüge entstehen. Bei Visarisiko sollten flexible Produkte gewählt und Anträge früh gestellt werden.',
        },
        {
          q: 'Wer ist für die Passgültigkeit verantwortlich?',
          a: 'Gültigkeit, freie Seiten, Beschädigung, alte Dokumenttypen, Zustimmung für Kinder und Identitätsanforderungen liegen in der Verantwortung des Reisenden. Viele Länder verlangen einen noch mindestens sechs Monate nach Reiseende gültigen Pass. Prüfen Sie offizielle Quellen, bevor Sie endgültig buchen.',
        },
        {
          q: 'Sind Visainformationen der Agentur verbindlich?',
          a: 'Informationen der Agentur sind allgemeine Orientierung und ersetzen keine Entscheidung offizieller Stellen. Visumart, Unterlagenliste, Terminlage, Biometrie und Gebühren ändern sich nach Land und persönlicher Situation. Offizielle Quellen, Konsulate und autorisierte Antragswege haben Vorrang.',
        },
        {
          q: 'Reicht eine Reiseversicherung für ein Visum aus?',
          a: 'Eine Reisekrankenversicherung kann für viele Visa verpflichtend sein, garantiert aber keine Visumerteilung. Deckungssumme, Länderbereich und Datumsumfang müssen den Anforderungen entsprechen. Prüfen Sie die aktuellen Regeln des Ziellandes vor dem Abschluss.',
        },
        {
          q: 'Was passiert, wenn ich wegen fehlender Dokumente nicht reisen kann?',
          a: 'Fehlende Visa, Pässe, Ausweise, Impfnachweise, elterliche Zustimmung oder Einreiseformulare können als Verantwortung des Reisenden gelten. Wird die Beförderung oder Einreise deshalb verweigert, kann kein Erstattungsanspruch bestehen. Die Agentur kann beraten, die endgültige Dokumentenkontrolle bleibt beim Reisenden.',
        },
      ],
    },
    {
      id: 'account',
      title: 'Konto, Zugang und Sicherheit',
      description:
        'Benutzerkonto, Kontaktdaten, Passwortschutz, unbefugte Vorgänge und Benachrichtigungen.',
      items: [
        {
          q: 'Muss ich ein Konto erstellen?',
          a: 'Bei einigen Produkten ist eine schnelle Anfrage ohne Konto möglich; für Buchungsverfolgung, Dokumentenzugriff und Supportverlauf wird ein Konto empfohlen. Aktuelle Kontodaten erleichtern die operative Kommunikation. Änderungen von E-Mail oder Telefon sollten unverzüglich aktualisiert werden.',
        },
        {
          q: 'Wie schütze ich Passwort und Konto?',
          a: 'Nutzen Sie ein starkes, einzigartiges Passwort und geben Sie Passwörter oder Bestätigungscodes nicht weiter. Melden Sie sich auf gemeinsam genutzten Geräten ab und verwalten Sie gespeicherte Karten- oder Passwortdaten im Browser sorgfältig. Bei verdächtigem Zugriff kontaktieren Sie sofort den Support.',
        },
        {
          q: 'Wer haftet für Vorgänge über mein Konto?',
          a: 'Buchungsanfragen, Datenänderungen und Nachrichten über Ihr Konto können als Ihre Vorgänge gewertet werden. Bei Verdacht auf unbefugte Nutzung informieren Sie uns schnellstmöglich schriftlich. Schäden vor der Meldung werden nach Ereignisart und Sicherheitsaufzeichnungen bewertet.',
        },
        {
          q: 'Was passiert bei falschen Kontaktdaten?',
          a: 'Falsche E-Mail- oder Telefonnummern können verhindern, dass Voucher, Zahlungserinnerungen, Betriebsänderungen oder Stornomitteilungen ankommen. Daraus entstehende Verzögerungen und Rechtsverluste können dem Kunden zugerechnet werden. Prüfen Sie Ihre Kontaktdaten vor der Buchung und vor Reisebeginn.',
        },
        {
          q: 'Kann ich Konto oder Buchungshistorie löschen lassen?',
          a: 'Sie können im Rahmen Ihrer Datenschutzrechte Auskunft, Berichtigung, Löschung oder Einschränkung der Verarbeitung verlangen. Einige Unterlagen müssen wegen Rechnungen, Verträgen, Streitigkeiten und gesetzlichen Aufbewahrungspflichten weiter gespeichert werden. Einzelheiten stehen unter /legal/privacy.',
        },
        {
          q: 'Was soll ich bei Betrugsverdacht tun?',
          a: 'Zahlen Sie nicht, wenn Sie eine verdächtige Nachricht, einen gefälschten Zahlungslink oder eine abweichende IBAN im Namen von {brand} erhalten. Verifizieren Sie über {phone}, {phone2} oder {email}. Unsere offizielle Website ist {site}; geben Sie über unsichere Links keine persönlichen oder Kartendaten ein.',
        },
      ],
    },
    {
      id: 'privacy',
      title: 'KVKK, Datenschutz und Cookies',
      description:
        'Verarbeitung, Weitergabe, Speicherung personenbezogener Daten, Cookies und Kommunikationszustimmungen.',
      items: [
        {
          q: 'Welche personenbezogenen Daten werden verarbeitet?',
          a: 'Im Buchungs- und Supportprozess können Name, Kontaktdaten, Ausweis- oder Passdaten, Reisepräferenzen, Zahlungsinformationen und Korrespondenz verarbeitet werden. Die Datenarten ändern sich je nach Produkt. Umfang und Rechtsgrundlagen sind unter /legal/privacy erläutert.',
        },
        {
          q: 'An wen werden meine Daten weitergegeben?',
          a: 'Zur Leistungserbringung können notwendige Daten an Hotels, Villeneigentümer, Reiseveranstalter, Beförderer, Zahlungsinstitute, Versicherer, Technologieanbieter und zuständige Behörden übermittelt werden. Die Weitergabe ist auf Buchungsdurchführung und gesetzliche Pflichten beschränkt. Unnötige Datenübermittlung wird vermieden.',
        },
        {
          q: 'Wie kann ich meine KVKK-Rechte ausüben?',
          a: 'Anfragen zu Auskunft, Berichtigung, Löschung, Widerspruch gegen Verarbeitung und weiteren gesetzlichen Rechten können Sie an {email} senden. Die Anfrage muss Informationen zur Identitätsprüfung enthalten. Anträge werden innerhalb der gesetzlichen Fristen bewertet.',
        },
        {
          q: 'Warum werden Cookies genutzt?',
          a: 'Cookies dienen dem Betrieb der Website, Sicherheit, Speicherung von Präferenzen, Leistungsmessung und, soweit erlaubt, Verbesserung des Marketingerlebnisses. Notwendige Cookies sind für den Dienst erforderlich. Einstellungen und Details finden Sie unter /legal/cookies.',
        },
        {
          q: 'Kann ich Marketingmitteilungen abbestellen?',
          a: 'Einwilligungen für kommerzielle elektronische Kommunikation können jederzeit widerrufen werden. Zwingende Informationen zu bestehenden Buchungen können unabhängig von Marketingeinwilligungen gesendet werden. Nutzen Sie die Abmeldemethode in der Nachricht oder schreiben Sie an {email}.',
        },
        {
          q: 'Werden meine Zahlungsdaten gespeichert?',
          a: 'Kartenzahlungen werden über autorisierte Zahlungsinfrastrukturen abgewickelt; Sicherheitsdaten der Karte speichert die Agentur nicht im Klartext. Transaktionsreferenzen, Zahlungsergebnisse und Buchhaltungsunterlagen können aus gesetzlichen Gründen gespeichert werden. Bei Sicherheitsverdacht wenden Sie sich sofort an Bank und Agentur.',
        },
      ],
    },
    {
      id: 'partners',
      title: 'Anbieter und Agenturpartner',
      description:
        'Partnerschaftsanfragen und Qualitätsanforderungen für Hotels, Villen, Touren, Transfers, Yachten und Agenturen.',
      items: [
        {
          q: 'Wie kann ich mein Produkt auf {brand} veröffentlichen?',
          a: 'Für Hotels, Villen, Touren, Yachten, Transfers oder ähnliche Reiseprodukte senden Sie Ihre Partnerschaftsanfrage über /contact oder an {email}. Fügen Sie Unternehmensdaten, Lizenzen oder Vollmachten, Produktbeschreibung, Preismodell, Bilder und operative Kontakte bei. Nach Eignungsprüfung meldet sich unser Team.',
        },
        {
          q: 'Welche Unterlagen werden von Anbietern verlangt?',
          a: 'Je nach Produkt können Steuerunterlagen, Tätigkeitsnachweise, Tourismuszertifikate, Bootslizenzen, Versicherungen, Beförderungsgenehmigungen, Kammerregistrierung oder Nachweise der Vertragsberechtigung verlangt werden. Die Dokumente müssen aktuell und überprüfbar sein. Bei fehlenden Unterlagen kann keine Veröffentlichung erfolgen.',
        },
        {
          q: 'Welche Qualitätsstandards gelten für Texte und Bilder?',
          a: 'Besuchertexte müssen korrekt, aktuell, natürlich und nicht irreführend sein. Bilder müssen zum jeweiligen Produkt gehören und Zimmer, Villa, Boot oder Tourerlebnis realistisch darstellen. Falsche Bilder, übertriebene Versprechen oder fehlende Regelhinweise können zur Entfernung führen.',
        },
        {
          q: 'Wie werden Preise und Verfügbarkeiten verwaltet?',
          a: 'Der Anbieter ist dafür verantwortlich, Preise, Kontingente, Saisonzeiten, Sperrdaten und Sonderbedingungen aktuell zu halten. Entsteht durch falsche Preise oder Verfügbarkeit ein Kundennachteil, wird die Verantwortung nach Vertrag bewertet. Wichtige Änderungen müssen der Agentur unverzüglich schriftlich gemeldet werden.',
        },
        {
          q: 'Ist Zusammenarbeit mit anderen Agenturen möglich?',
          a: 'Kooperationen mit autorisierten Reiseagenturen, Firmenverkaufsteams und Destinationsspezialisten können geprüft werden. Provision, Markennutzung, Kundenkommunikation und Zahlungsfluss werden schriftlich vereinbart. Agenturbelgnummer und zuständige Kontaktperson sollten in der Bewerbung stehen.',
        },
        {
          q: 'Wie werden Kundenbeschwerden an Anbieter weitergegeben?',
          a: 'Kundenbeschwerden werden mit Unterlagen, Datum, Buchungsdatensatz und operativen Notizen an den Anbieter gesendet. Wir erwarten eine nachvollziehbare Stellungnahme und Lösung innerhalb angemessener Zeit. Wiederholte Beschwerden, bestätigte Leistungsmängel oder irreführende Informationen können zur Aussetzung des Produkts führen.',
        },
      ],
    },
  ],
}
