import type { LegalFaqBundle } from './types'

export const fr: LegalFaqBundle = {
  metaTitle: 'Questions fréquentes | Rezervasyon Yap',
  metaDescription:
    'Questions sur les réservations, paiements, annulations, hôtels, villas, circuits, yachts, transport, visas, confidentialité et partenariats pour Rezervasyon Yap et Mamon Plus Travel Agency.',
  pageTitle: 'Questions fréquentes juridiques et opérationnelles',
  pageLead:
    'Cette page réunit les informations essentielles sur l’identité de la société, le processus de réservation, les paiements, les annulations, l’hébergement, les circuits, le transport, les visas, la sécurité du compte et les données personnelles lorsque vous planifiez un voyage avec {brand}.',
  categoriesHeading: 'Rubriques',
  backToCategories: 'Retour aux rubriques',
  openCategory: 'Ouvrir la rubrique',
  questionsCount: '{count} questions',
  categories: [
    {
      id: 'general',
      title: 'Informations générales et identité de la société',
      description:
        '{brand} est la plateforme de réservation en ligne de {agency}, qui propose des produits de voyage dans un cadre transparent de service d’agence.',
      items: [
        {
          q: 'Quelle société exploite {brand} ?',
          a: '{brand} est exploité par {legalName}. Les services d’agence de voyages sont fournis sous le nom {agency}, enregistré comme {tursab}. Notre adresse est {address}; vous pouvez nous joindre à {email}, {phone}, {phone2} et sur les lignes de bureau {officePhones}.',
        },
        {
          q: 'Les informations du site constituent-elles une offre officielle ?',
          a: 'Les prix, disponibilités, programmes et visuels du site reposent sur les données des fournisseurs et sur un contrôle éditorial au moment de la demande. Le périmètre définitif du service, les conditions de paiement et les notes particulières sont confirmés dans la confirmation de réservation ou l’écran contractuel. Si un détail est déterminant, demandez une confirmation écrite via /contact.',
        },
        {
          q: 'Quels produits de voyage {agency} peut-il organiser ?',
          a: '{agency} peut intervenir comme intermédiaire ou organisateur pour des hôtels, villas, forfaits touristiques, excursions à la journée, locations de yachts, transferts, vols, ferries et autres services demandés. Chaque produit peut avoir son propre fournisseur, modèle opérationnel et régime d’annulation. Il faut donc lire la page produit avec /legal/terms et /legal/cancellation.',
        },
        {
          q: 'Comment contacter l’agence avant de réserver ?',
          a: 'Vous pouvez écrire à {email}, appeler les lignes de réservation {phone} et {phone2}, ou utiliser le formulaire /contact. En période de forte demande, les requêtes écrites sont traitées dans leur ordre d’arrivée. Pour une date proche, indiquez le produit, la date, le nombre de voyageurs et un téléphone joignable.',
        },
        {
          q: 'Comment les contenus de la plateforme sont-ils préparés ?',
          a: 'Les textes produits sont rédigés à partir des informations fournisseurs, des conditions contractuelles et de contrôles éditoriaux. Nous veillons à ce que les contenus visibles par les visiteurs soient clairs, à jour et non trompeurs, mais des changements peuvent venir des hôtels, transporteurs, propriétaires de bateaux ou autorités locales. Avant tout engagement important, il convient de confirmer la disponibilité et le périmètre actualisés.',
        },
        {
          q: 'Quels textes juridiques dois-je consulter ?',
          a: 'Consultez /legal/terms pour les conditions générales d’utilisation et de vente, /legal/cancellation pour l’annulation et le remboursement, /legal/privacy pour les données personnelles et /legal/cookies pour les préférences de cookies. Ces textes s’appliquent avec les conditions propres au produit. Une condition spéciale clairement indiquée peut prévaloir pour le produit concerné.',
        },
      ],
    },
    {
      id: 'booking',
      title: 'Processus de réservation',
      description:
        'Les étapes de recherche, offre, prévalidation, paiement et confirmation définitive.',
      items: [
        {
          q: 'Comment créer une réservation ?',
          a: 'Choisissez un produit puis renseignez la date, le nombre de voyageurs, le type de chambre ou de service et les autres informations demandées. Le système peut afficher la disponibilité et le prix; certains produits nécessitent une validation de l’agence ou du fournisseur. Une fois le paiement ou l’acompte requis effectué, les détails confirmés sont envoyés sur vos canaux de contact enregistrés.',
        },
        {
          q: 'Toute demande devient-elle automatiquement une réservation ferme ?',
          a: 'Non. Les villas, yachts, circuits de groupe, transferts privés et hébergements à prix dynamique peuvent nécessiter une vérification préalable. La réservation ferme n’existe qu’après respect des conditions de paiement et confirmation par l’agence. Les arrangements effectués avant cette confirmation relèvent du risque du client.',
        },
        {
          q: 'Quelles informations dois-je vérifier avant de confirmer ?',
          a: 'Vérifiez attentivement les noms, données d’identité ou de passeport, dates, nombre de voyageurs, âges, type de chambre et demandes spéciales. Une information erronée ou manquante peut entraîner des frais, un refus de service ou un blocage par un transporteur. En cas d’erreur, écrivez immédiatement à {email}.',
        },
        {
          q: 'Les demandes spéciales sont-elles garanties ?',
          a: 'Lit bébé, chambres communicantes, étage élevé, arrivée anticipée, menu spécial, itinéraire de yacht ou temps d’attente de transfert sont transmis au fournisseur. Ces demandes ne deviennent contractuelles que si le fournisseur les confirme par écrit. Les demandes payantes ou soumises à disponibilité peuvent nécessiter une validation séparée.',
        },
        {
          q: 'Quand recevrai-je mes documents de réservation ?',
          a: 'Pour les réservations confirmées, le voucher, le résumé contractuel, les informations de paiement ou les notes opérationnelles sont transmis par voie électronique. Pour certains services, le point de rendez-vous final, les coordonnées du guide ou du capitaine peuvent être envoyés plus près du départ. Conservez ces documents et gardez-les disponibles au début du service.',
        },
        {
          q: 'Puis-je modifier ma réservation ?',
          a: 'Les modifications de date, nom, nombre de voyageurs ou périmètre de service dépendent des règles du produit, de l’accord du fournisseur et de la disponibilité. Elles peuvent entraîner des frais, une différence de prix ou de nouvelles conditions d’annulation. Une demande écrite et anticipée réduit le risque de perte de droits.',
        },
      ],
    },
    {
      id: 'payment',
      title: 'Paiement, sécurité et factures',
      description:
        'Modes de paiement, encaissements, écarts de change, facturation et sécurité des transactions.',
      items: [
        {
          q: 'Quels modes de paiement sont disponibles ?',
          a: 'Selon le produit, vous pouvez payer par carte bancaire, virement, POS virtuel, paiement échelonné ou autre canal sécurisé indiqué par l’agence. Le mode et l’échéance figurent sur la page produit ou dans la confirmation. Ne payez pas sur un compte personnel ni via un lien non vérifié en dehors du canal officiel.',
        },
        {
          q: 'Comment fonctionnent acompte et solde ?',
          a: 'Certaines réservations exigent un acompte pour bloquer le service, le solde étant dû à une date fixée ou à l’arrivée. Si l’échéance du solde n’est pas respectée, la réservation peut être menacée selon les règles d’annulation. Comme le calendrier de paiement est confirmé par écrit, nous recommandons de créer des rappels.',
        },
        {
          q: 'Dans quelle devise les prix sont-ils encaissés ?',
          a: 'Le prix peut être affiché en livre turque ou dans la devise du service concerné. Pour les produits en devise, le taux du jour, les commissions bancaires ou les règles de l’émetteur de carte peuvent créer un écart. La devise finale d’encaissement est indiquée sur l’écran de paiement ou dans la confirmation de l’agence.',
        },
        {
          q: 'Puis-je recevoir une facture ou un reçu ?',
          a: 'Pour la facturation, il faut fournir correctement le nom ou la raison sociale, le numéro fiscal ou d’identité, le bureau fiscal et l’adresse. Pour les services intermédiés, la facture du fournisseur et les frais de service de l’agence peuvent être émis séparément. Envoyez votre demande pendant le paiement ou rapidement à {email}.',
        },
        {
          q: 'Comment la sécurité du paiement est-elle assurée ?',
          a: 'Les paiements par carte passent par des infrastructures autorisées; l’agence ne demande pas les données sensibles de carte en texte clair. En cas de lien suspect, de bénéficiaire différent ou de demande inhabituelle, vérifiez par téléphone au {phone} avant de payer. Ne communiquez jamais les mots de passe bancaires à usage unique.',
        },
        {
          q: 'Le prix peut-il changer après paiement ?',
          a: 'Après confirmation définitive et encaissement, le prix du même périmètre de service est fixé. Des changements demandés par le client, une variation du nombre de voyageurs, des taxes ou frais nouveaux, des frais de transporteur ou des suppléments obligatoires peuvent modifier le total. La raison et l’écart sont alors communiqués par écrit.',
        },
      ],
    },
    {
      id: 'cancellation',
      title: 'Annulation, remboursement et force majeure',
      description:
        'Délais d’annulation, no-show et changements inévitables pour forfaits, hôtels, villas et autres services.',
      items: [
        {
          q: 'Quelle est la règle des 30 jours pour les forfaits touristiques ?',
          a: 'En principe, une annulation écrite d’un forfait au moins 30 jours avant le départ est examinée pour remboursement après déduction des frais obligatoires et retenues prévues au contrat. À moins de 30 jours, les conditions fournisseur, transporteur ou contractuelles peuvent prévoir des retenues plus élevées. Les dispositions détaillées de /legal/cancellation font foi.',
        },
        {
          q: 'Comment s’appliquent les paliers hôteliers 15/7/3 jours ?',
          a: 'Pour les hôtels, des conditions plus souples peuvent s’appliquer jusqu’à 15, 7 ou 3 jours avant l’arrivée selon le type d’établissement, la saison, la promotion et les dates spéciales. Après ces délais, la première nuit, un pourcentage ou la totalité du prix peut être retenu. Les tarifs non remboursables, early booking ou promotionnels peuvent être plus stricts.',
        },
        {
          q: 'Que se passe-t-il en cas de no-show ?',
          a: 'Le no-show signifie que le client ne se présente pas au début du service, sans prévenir, à l’hôtel, au circuit, au bateau, au véhicule ou auprès du transporteur. Le fournisseur peut considérer le service comme utilisé et aucun remboursement ne peut être dû. En cas de retard ou d’impossibilité, prévenez l’agence et le fournisseur par écrit au plus vite.',
        },
        {
          q: 'Quel est le délai d’un remboursement ?',
          a: 'Le remboursement est traité par le canal de paiement initial après clarification des conditions d’annulation et rapprochement avec le fournisseur. Les délais des banques et réseaux de cartes ne dépendent pas de l’agence. Les cartes étrangères, paiements échelonnés ou encaissements en devise peuvent prendre plus de temps.',
        },
        {
          q: 'La force majeure donne-t-elle toujours droit à un remboursement intégral ?',
          a: 'Catastrophe naturelle, épidémie, interdiction officielle de voyager, décision de sécurité, fermeture de port ou annulation de vol sont appréciées selon le produit. La force majeure ne signifie pas automatiquement remboursement total; les règles du transporteur, de l’hôtel, des autorités et du contrat s’appliquent ensemble. Un report, un avoir ou un remboursement partiel peut être proposé par écrit.',
        },
        {
          q: 'Comment envoyer une demande d’annulation ?',
          a: 'Les demandes d’annulation ou de modification doivent être envoyées par écrit à {email} ou via /contact. Indiquez le numéro de réservation, le nom, la date du service et le motif. Les appels peuvent orienter, mais la date de traitement repose sur la trace écrite.',
        },
      ],
    },
    {
      id: 'hotels',
      title: 'Hôtels et hébergement',
      description:
        'Arrivée, départ, usage des chambres, politiques enfants et règles de l’établissement.',
      items: [
        {
          q: 'Quels sont les horaires d’arrivée et de départ ?',
          a: 'L’arrivée se fait généralement l’après-midi et le départ le matin ou avant midi, mais les horaires exacts dépendent de l’établissement. Une arrivée anticipée ou un départ tardif n’est possible qu’avec disponibilité et accord de l’hôtel. Ces demandes peuvent être payantes et ne sont pas garanties par une simple note.',
        },
        {
          q: 'Le type de chambre et la literie sont-ils garantis ?',
          a: 'La catégorie de chambre achetée est garantie; le type de lit, la vue, l’étage ou les chambres communicantes dépendent de la disponibilité. Si une caractéristique est clairement vendue sur la page produit, elle fait partie de la réservation. En cas d’attribution différente, prévenez immédiatement la réception et l’agence.',
        },
        {
          q: 'Pourquoi l’âge des enfants et les personnes supplémentaires comptent-ils ?',
          a: 'Les hôtels peuvent appliquer des tarifs ou règles d’acceptation différents selon l’âge de l’enfant, le lit bébé, le lit supplémentaire et la capacité maximale. Un âge erroné peut entraîner une différence de prix ou un changement de chambre à l’arrivée. Tous les âges à la date d’arrivée doivent être exacts.',
        },
        {
          q: 'Le concept hôtelier et les services inclus peuvent-ils changer ?',
          a: 'Buffet, restaurant à la carte, plage, piscine, spa, animation ou services saisonniers peuvent varier selon l’occupation, la météo et les règles locales. La page produit doit être lue avec les conditions opérationnelles à la date du séjour. Si un service est essentiel, demandez une confirmation écrite avant de réserver.',
        },
        {
          q: 'Comment s’appliquent les règles animaux, tabac et établissement ?',
          a: 'Acceptation des animaux, zones fumeurs, limites d’âge, dépôts, code vestimentaire et visiteurs relèvent des règles propres à l’établissement. L’agence ne peut pas les modifier. Un manquement peut entraîner refus de service, frais de nettoyage ou retenue sur dépôt.',
        },
        {
          q: 'Que faire en cas de problème à l’hôtel ?',
          a: 'Signalez d’abord le problème à la réception le jour même et demandez une solution. Si rien n’est résolu, envoyez photos, documents et courte explication à {email} ou appelez la ligne de réservation. Un problème signalé pour la première fois après le séjour sera évalué de façon limitée faute de solution sur place.',
        },
      ],
    },
    {
      id: 'villas',
      title: 'Villas et hébergements privés',
      description:
        'Dépôt, procédure d’arrivée, dommages, capacité et règles de maison pour les locations de villas.',
      items: [
        {
          q: 'Pourquoi un dépôt est-il demandé pour une villa ?',
          a: 'Pour les villas, appartements et hébergements privés, un dépôt peut couvrir dommages, objets perdus, nettoyage inhabituel ou consommation d’énergie. Le montant et le mode de paiement sont indiqués sur la page produit ou le voucher. Si le contrôle de sortie ne révèle pas de problème, il est restitué selon les règles du fournisseur.',
        },
        {
          q: 'Comment se passent l’arrivée et la remise des clés ?',
          a: 'L’heure d’arrivée, le point de rendez-vous et la remise des clés sont organisés par le propriétaire ou l’équipe locale. Déclaration d’identité, paiement du solde ou dépôt peuvent être finalisés à l’arrivée. En cas de retard, prévenez l’équipe; une arrivée tardive peut entraîner des frais.',
        },
        {
          q: 'Puis-je dépasser la capacité de la villa ?',
          a: 'La capacité maximale publiée ne peut pas être dépassée pour des raisons de sécurité, de licence et de règles d’hébergement. Les enfants et bébés doivent aussi être déclarés. Des personnes non déclarées peuvent entraîner supplément, refus de service ou résiliation du contrat.',
        },
        {
          q: 'Qui gère piscine, jardin et pannes techniques ?',
          a: 'Piscine privée, jacuzzi, jardin, internet, climatisation ou systèmes d’eau et d’électricité peuvent connaître des pannes. Si le fournisseur est prévenu rapidement, une réparation ou une solution raisonnable est recherchée. L’agence ne garantit pas d’indemnisation pour coupures régionales, météo ou infrastructure publique.',
        },
        {
          q: 'Les annulations de villas diffèrent-elles des hôtels ?',
          a: 'Oui. Les villas ont un stock limité et sont réservées spécifiquement au client; les acomptes sont donc souvent non remboursables ou soumis à des conditions strictes. Saison, date d’arrivée et contrat du propriétaire déterminent les frais. Lisez /legal/cancellation et les conditions spéciales avant de réserver.',
        },
        {
          q: 'Puis-je organiser une fête, un événement ou recevoir des visiteurs ?',
          a: 'Fête, événement bruyant, tournage commercial, préparation de mariage ou visiteurs extérieurs nécessitent l’accord du propriétaire. Sans autorisation écrite, ces usages peuvent violer les règles de voisinage, sécurité et licence. Si vous avez ce projet, indiquez clairement le périmètre avant la réservation.',
        },
      ],
    },
    {
      id: 'tours',
      title: 'Circuits et activités',
      description:
        'Forfaits, excursions à la journée, guidage, minimum de participants et modifications de programme.',
      items: [
        {
          q: 'Le programme du circuit est-il définitif ?',
          a: 'Le programme présente l’itinéraire, les visites et le périmètre prévus. L’ordre et les durées peuvent changer en raison de la météo, du trafic, des autorisations, fermetures de musées, mesures de sécurité ou contraintes opérationnelles. Les changements importants du service principal sont communiqués autant que possible.',
        },
        {
          q: 'Que se passe-t-il si le nombre minimum de participants n’est pas atteint ?',
          a: 'Certains circuits de groupe dépendent d’un minimum de participants. S’il n’est pas atteint, le circuit peut être annulé, une autre date proposée ou une option privée offerte avec supplément. Si l’annulation vient de l’agence, les montants éligibles encaissés sont remboursés selon le contrat.',
        },
        {
          q: 'Comment sont fixés la langue du guide et le rendez-vous ?',
          a: 'La langue du guide figure sur la page produit ou la confirmation de réservation. Le point de rendez-vous, l’heure et les coordonnées sont indiqués dans le voucher ou envoyés avant le circuit. Un voyageur absent à l’heure convenue peut être considéré comme no-show.',
        },
        {
          q: 'Quelles dépenses ne sont pas incluses ?',
          a: 'Dépenses personnelles, certaines entrées de musées, boissons, activités optionnelles, pourboires et services non clairement indiqués comme inclus sont généralement exclus. La liste inclus/non inclus fait partie du produit et doit être lue attentivement. Des paiements locaux peuvent exiger espèces ou autre devise.',
        },
        {
          q: 'Existe-t-il des conditions d’âge, santé ou condition physique ?',
          a: 'Les circuits avec marche, bateau, plongée, safari, rafting ou longs transferts peuvent prévoir des exigences d’âge, de santé et de mobilité. Grossesse, maladie chronique, handicap ou besoin d’assistance doivent être déclarés avant la réservation. Le fournisseur peut refuser une participation jugée dangereuse.',
        },
        {
          q: 'Quand verrai-je le contrat de forfait touristique ?',
          a: 'Pour les services constituant un forfait, les services principaux, le prix, les règles d’annulation et les informations des parties sont fournis avant la vente ou pendant la confirmation. Ne payez pas sans avoir lu les documents et posez les questions par écrit. /legal/terms et /legal/cancellation s’appliquent aussi.',
        },
      ],
    },
    {
      id: 'yachts',
      title: 'Yachts, bateaux et croisières bleues',
      description:
        'Location de yacht, itinéraires, météo, décisions du capitaine, ports et dépôts.',
      items: [
        {
          q: 'L’itinéraire du yacht est-il fixé à la réservation ?',
          a: 'L’itinéraire est planifié selon le bateau, la durée, le port, la météo et les autorisations locales. Le capitaine peut modifier baies, ports ou ordre de navigation pour des raisons de sécurité. Communiquez vos attentes avant la réservation afin de choisir le bateau et la durée adaptés.',
        },
        {
          q: 'Y a-t-il remboursement si la météo change la sortie ?',
          a: 'La sécurité en mer dépend du capitaine et des autorités compétentes. Le mauvais temps peut raccourcir l’itinéraire, imposer des baies alternatives ou reporter le départ. Remboursement, report ou service alternatif sont déterminés par le contrat produit et le service effectivement fourni.',
        },
        {
          q: 'Qu’est-ce qui est inclus dans une location de yacht ?',
          a: 'Bateau, capitaine ou équipage, limite de carburant, nettoyage, repas, boissons, taxes portuaires et sports nautiques varient selon le bateau. Les éléments inclus et exclus figurent dans l’offre ou la page produit. Toute ligne incertaine doit être confirmée par écrit avant paiement.',
        },
        {
          q: 'Comment fonctionnent dépôt et responsabilité des dommages ?',
          a: 'Un charter privé ou sans équipage peut exiger un dépôt de garantie. Dommage au matériel, objet perdu, nettoyage inhabituel ou usage contraire au contrat peut être déduit du dépôt. Participez aux contrôles de remise et de restitution et faites noter les remarques par écrit.',
        },
        {
          q: 'Puis-je apporter nourriture et boissons à bord ?',
          a: 'Nourriture et boissons extérieures, catering, changement de menu ou célébration spéciale dépendent de la politique de l’opérateur. Certains bateaux facturent service, nettoyage ou imposent un menu. Allergies et préférences alimentaires doivent être signalées avant la réservation.',
        },
        {
          q: 'Qui est responsable des ports, passeports et sorties internationales ?',
          a: 'Pour les itinéraires internationaux, passeports, visas, taxes de sortie et formalités portuaires relèvent du voyageur; l’agence peut donner des indications opérationnelles. Une sortie impossible pour document manquant peut être considérée comme imputable au client. Vérifiez les règles officielles avant le voyage.',
        },
      ],
    },
    {
      id: 'transport',
      title: 'Vols, ferries, transferts et transporteurs',
      description:
        'Règles transporteurs, changements de billets, bagages, retards, attente de transfert et informations opérationnelles.',
      items: [
        {
          q: 'Quelles règles s’appliquent aux billets d’avion et de ferry ?',
          a: 'Pour vols, ferries, bus et services similaires, les règles tarifaires, bagages, changement de nom, annulation et remboursement du transporteur concerné s’appliquent. L’agence ne peut pas les modifier et fournit seulement assistance de traitement et information. Après émission, des pénalités ou frais de service peuvent apparaître.',
        },
        {
          q: 'Que faire en cas d’erreur de nom sur le billet ?',
          a: 'Les noms doivent correspondre à la pièce d’identité ou au passeport. Faute de lettre, deuxième prénom manquant ou changement de nom peuvent être refusés par le transporteur. Signalez l’erreur immédiatement à {email}; une correction n’est possible que selon les règles et frais du transporteur.',
        },
        {
          q: 'Comment le temps d’attente d’un transfert est-il calculé ?',
          a: 'Le temps d’attente dépend du type de transfert, de l’arrivée à l’aéroport, du suivi de vol et du véhicule privé ou partagé. Donnez le bon numéro de vol et informez l’équipe opérationnelle des retards. Dépasser le temps inclus peut entraîner frais supplémentaires ou perte de service.',
        },
        {
          q: 'L’acceptation des bagages et équipements spéciaux est-elle garantie ?',
          a: 'La franchise bagage dépend du transporteur ou de la capacité du véhicule. Poussette, matériel sportif, fauteuil roulant, animal ou excédent de bagage doivent être déclarés à l’avance. Un équipement non déclaré peut nécessiter véhicule ou frais supplémentaires, ou être refusé.',
        },
        {
          q: 'Quel est le rôle de l’agence en cas de retard ou annulation du transporteur ?',
          a: 'Les retards, annulations, changements d’itinéraire et incidents opérationnels du transporteur relèvent de ses propres règles de responsabilité. L’agence aide à rechercher des alternatives, communiquer avec les fournisseurs et transmettre les documents. Hébergement, nouveau billet ou transfert supplémentaire sont évalués selon les conditions du produit.',
        },
        {
          q: 'Puis-je modifier l’itinéraire d’un transfert privé ?',
          a: 'Un transfert privé est tarifé pour un point de départ et un point d’arrivée convenus. Arrêt intermédiaire, prolongation de route, attente ou adresse différente nécessitent accord opérationnel et peuvent entraîner des frais. Il vaut mieux informer l’agence plutôt que demander directement au chauffeur une prestation hors contrat.',
        },
      ],
    },
    {
      id: 'visa',
      title: 'Visa, passeport et documents de voyage',
      description:
        'Limites du conseil visa, décision consulaire, responsabilité documentaire et règles d’entrée.',
      items: [
        {
          q: '{agency} est-il un centre de visas ?',
          a: '{agency} est une agence de voyages; sauf vente explicite d’un produit visa, elle n’agit pas comme centre officiel de demande de visa ni représentant consulaire. Nous pouvons donner des informations générales liées aux produits de voyage. La décision finale appartient toujours au consulat, à la police aux frontières ou à l’autorité compétente.',
        },
        {
          q: 'Un refus de visa donne-t-il droit au remboursement du voyage ou du billet ?',
          a: 'Un refus de visa ne supprime pas automatiquement les règles d’annulation du produit. Les conditions de l’hôtel, du circuit, du billet ou du transporteur restent applicables; les services non remboursables peuvent être retenus. En cas de risque visa, choisissez des produits flexibles et déposez la demande tôt.',
        },
        {
          q: 'Qui est responsable de la validité du passeport ?',
          a: 'Validité du passeport, pages libres, détérioration, ancien type de document, autorisation parentale et conformité d’identité relèvent du voyageur. Beaucoup de pays exigent un passeport valable au moins six mois après le voyage. Vérifiez les sources officielles avant de finaliser la réservation.',
        },
        {
          q: 'Les informations visa données par l’agence sont-elles contraignantes ?',
          a: 'Les informations de l’agence sont une orientation générale et ne remplacent pas une décision officielle. Type de visa, liste de documents, délais de rendez-vous, biométrie et frais varient selon le pays et la situation personnelle. Les sources officielles, consulats et canaux autorisés ont toujours priorité.',
        },
        {
          q: 'Une assurance voyage suffit-elle pour un visa ?',
          a: 'L’assurance santé voyage peut être obligatoire pour de nombreuses demandes, mais elle ne garantit pas l’obtention du visa. Plafond, zone de couverture et dates doivent répondre aux exigences. Vérifiez les règles actuelles du pays de destination avant d’acheter la police.',
        },
        {
          q: 'Que se passe-t-il si je ne peux pas voyager faute de documents ?',
          a: 'Visa, passeport, carte d’identité, certificat vaccinal, autorisation parentale ou formulaire d’entrée manquant peuvent être considérés comme imputables au voyageur. Si un transporteur ou agent frontière refuse le départ, aucun remboursement ne peut être dû. L’agence peut conseiller, mais le contrôle final des documents appartient au voyageur.',
        },
      ],
    },
    {
      id: 'account',
      title: 'Compte, accès et sécurité',
      description:
        'Compte utilisateur, coordonnées, sécurité du mot de passe, opérations non autorisées et notifications.',
      items: [
        {
          q: 'La création d’un compte est-elle obligatoire ?',
          a: 'Certains produits permettent une demande rapide sans compte, mais un compte est recommandé pour suivre les réservations, accéder aux documents et conserver l’historique support. Des informations à jour facilitent la communication opérationnelle. Les changements d’e-mail ou de téléphone doivent être mis à jour sans délai.',
        },
        {
          q: 'Comment protéger mon mot de passe et mon compte ?',
          a: 'Utilisez un mot de passe fort et unique, et ne partagez ni mot de passe ni code de vérification. Déconnectez-vous sur les appareils partagés et gérez avec prudence les cartes ou mots de passe enregistrés dans le navigateur. En cas d’accès suspect, contactez immédiatement le support.',
        },
        {
          q: 'Qui est responsable des opérations effectuées depuis mon compte ?',
          a: 'Les demandes de réservation, modifications d’informations et messages envoyés depuis votre compte peuvent être considérés comme vos opérations. En cas de soupçon d’usage non autorisé, notifiez-nous par écrit dès que possible. Les pertes antérieures à la notification sont évaluées selon l’événement et les journaux de sécurité.',
        },
        {
          q: 'Que se passe-t-il si mes coordonnées sont incorrectes ?',
          a: 'Un e-mail ou téléphone erroné peut empêcher la réception du voucher, des rappels de paiement, des changements opérationnels ou des avis d’annulation. Les retards et pertes de droits qui en résultent peuvent relever de la responsabilité du client. Vérifiez vos coordonnées avant la réservation et avant le voyage.',
        },
        {
          q: 'Puis-je supprimer mon compte ou mon historique de réservation ?',
          a: 'Vous pouvez demander l’accès, la rectification, la suppression ou la limitation du traitement dans le cadre de vos droits sur les données personnelles. Certaines données doivent toutefois être conservées pour factures, contrats, litiges ou obligations légales. Les détails figurent dans /legal/privacy.',
        },
        {
          q: 'Que faire en cas de soupçon de fraude ?',
          a: 'Ne payez pas si vous recevez un message suspect, un faux lien de paiement ou un IBAN différent prétendant venir de {brand}. Demandez vérification via {phone}, {phone2} ou {email}. Notre site officiel est {site}; ne saisissez pas de données personnelles ou bancaires sur des liens non fiables.',
        },
      ],
    },
    {
      id: 'privacy',
      title: 'KVKK, confidentialité et cookies',
      description:
        'Traitement, partage et conservation des données personnelles, cookies et autorisations de communication.',
      items: [
        {
          q: 'Quelles données personnelles sont traitées ?',
          a: 'Lors des réservations et du support, nous pouvons traiter nom, coordonnées, informations d’identité ou de passeport, préférences de voyage, informations de transaction de paiement et correspondances. Les données varient selon le produit. Le périmètre et les bases juridiques sont détaillés dans /legal/privacy.',
        },
        {
          q: 'Avec qui mes données sont-elles partagées ?',
          a: 'Pour fournir le service, les données nécessaires peuvent être partagées avec hôtels, propriétaires de villas, opérateurs de circuits, transporteurs, établissements de paiement, assureurs, fournisseurs technologiques et autorités publiques compétentes. Le partage est limité à l’exécution de la réservation et aux obligations légales. Les transferts inutiles sont évités.',
        },
        {
          q: 'Comment exercer mes droits KVKK ?',
          a: 'Vous pouvez adresser vos demandes d’accès, rectification, suppression, opposition au traitement et autres droits légaux à {email}. La demande doit contenir les éléments permettant de vérifier votre identité. Les demandes sont évaluées dans les délais prévus par la loi.',
        },
        {
          q: 'Pourquoi les cookies sont-ils utilisés ?',
          a: 'Les cookies servent à faire fonctionner le site, assurer la sécurité, mémoriser les préférences, mesurer la performance et, lorsque c’est autorisé, améliorer l’expérience marketing. Les cookies nécessaires sont indispensables au service. Les préférences et détails figurent dans /legal/cookies.',
        },
        {
          q: 'Puis-je arrêter les messages marketing ?',
          a: 'Vous pouvez retirer à tout moment vos autorisations de communication électronique commerciale. Les informations obligatoires directement liées à une réservation peuvent être envoyées indépendamment du consentement marketing. Utilisez la méthode indiquée dans le message ou écrivez à {email}.',
        },
        {
          q: 'Mes données de paiement sont-elles conservées ?',
          a: 'Les paiements par carte sont traités via des infrastructures autorisées et les données de sécurité de carte ne sont pas conservées en clair par l’agence. Les références de transaction, résultats d’encaissement et pièces comptables peuvent être gardés pour obligations légales. En cas de doute de sécurité, contactez immédiatement votre banque et l’agence.',
        },
      ],
    },
    {
      id: 'partners',
      title: 'Fournisseurs et agences partenaires',
      description:
        'Demandes de partenariat et attentes qualité pour hôtels, villas, circuits, transferts, yachts et agences.',
      items: [
        {
          q: 'Comment publier mon produit sur {brand} ?',
          a: 'Pour hôtels, villas, circuits, yachts, transferts ou produits similaires, envoyez votre demande via /contact ou à {email}. Incluez les informations de société, licences ou autorisations, description du produit, modèle tarifaire, visuels et contacts opérationnels. Après analyse d’adéquation, notre équipe vous recontacte.',
        },
        {
          q: 'Quels documents sont demandés aux fournisseurs ?',
          a: 'Selon le produit, nous pouvons demander documents fiscaux, certificats d’activité, autorisations touristiques, licence de bateau, assurance, autorisation de transport, inscription professionnelle ou preuve du pouvoir contractuel. Les documents doivent être actuels et vérifiables. Un produit incomplet peut ne pas être publié.',
        },
        {
          q: 'Quels sont les standards qualité des contenus et visuels ?',
          a: 'Les textes visibles par les visiteurs doivent être exacts, actuels, naturels et non trompeurs. Les images doivent appartenir au produit concerné et représenter fidèlement la chambre, la villa, le bateau ou l’expérience de circuit. Visuels erronés, promesses exagérées ou règles manquantes peuvent entraîner le retrait.',
        },
        {
          q: 'Comment prix et disponibilités sont-ils gérés ?',
          a: 'Le fournisseur doit maintenir à jour prix, allotements, saisons, dates fermées et conditions spéciales. Si un prix ou une disponibilité erronés causent un préjudice client, la responsabilité est évaluée selon le contrat. Les changements critiques doivent être notifiés rapidement par écrit à l’agence.',
        },
        {
          q: 'Une coopération avec des agences est-elle possible ?',
          a: 'La coopération avec des agences de voyages autorisées, équipes de vente corporate et spécialistes destination peut être étudiée. Commission, usage de marque, communication client et flux de paiement sont fixés par écrit. Le numéro de certificat d’agence et la personne autorisée doivent figurer dans la demande.',
        },
        {
          q: 'Comment les réclamations clients sont-elles transmises aux fournisseurs ?',
          a: 'Les réclamations sont transmises au fournisseur avec documents, dates, dossier de réservation et notes opérationnelles. Une explication raisonnable et une solution sont attendues dans un délai approprié. Réclamations répétées, manquement confirmé ou information trompeuse peuvent conduire à la suspension du produit.',
        },
      ],
    },
  ],
}
