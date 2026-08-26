DO $$
DECLARE
  ws uuid := '83ed4e09-afd5-4243-a1e8-1ddb4a12d2da';
  usr uuid := 'f924b774-d387-4af6-84eb-740339802db7';
  pid uuid := '9c1f0a2e-2f1b-4a51-9d70-8f2c9a4b7e10';
  a_hero text := '/api/public/landing-asset/dd83dfb3-4b1f-4c74-b686-355ffa3243bc';
  a_pot text := '/api/public/landing-asset/19c46577-5c11-46d9-b13e-d7984ada421b';
  a_bel text := '/api/public/landing-asset/c389b93e-db12-40d6-adac-d85571f8240f';
  a_bon text := '/api/public/landing-asset/72fe787f-a6c1-4a28-b3a6-80aa376abc8f';
  a_punt text := '/api/public/landing-asset/e09dbc67-ff16-4797-ada1-dc273e9e2b0e';
  a_sint text := '/api/public/landing-asset/c5f7e1da-8e18-4160-8c3d-8cf0a17ce9da';
  a_team text := '/api/public/landing-asset/fa13e20d-7e86-409e-bacb-d0b26e6e2e09';
  a_weck text := '/api/public/landing-asset/a747fbd7-b060-478e-bf2d-222fb44c50bd';
  a_dream text := '/api/public/landing-asset/f45fb17b-126f-4077-8c0e-6d94b64d4876';
  a_groet text := '/api/public/landing-asset/d95ad3a0-b4c7-4aef-af17-d2c4adebb4d3';
BEGIN
  DELETE FROM public.landing_page_sections WHERE landing_page_id = pid;
  DELETE FROM public.landing_page_forms WHERE landing_page_id = pid;
  DELETE FROM public.landing_page_variants WHERE landing_page_id = pid;
  DELETE FROM public.landing_pages WHERE id = pid;

  INSERT INTO public.landing_pages (
    id, user_id, workspace_id, name, slug, funnel_type, status, template_key,
    active, noindex, is_test, theme, seo_title, seo_description,
    preview_token, version_counter
  ) VALUES (
    pid, usr, ws, 'Cadeauplatform (V2.0) — master', 'cadeauplatform-v20', 'platform', 'draft',
    'zoet-b2b-v1', true, true, false,
    '{"hazard_color_1":"#0f766e","hazard_color_2":"#f9a8d4"}'::jsonb,
    'Zakelijk cadeauaccount — ZoetBezorgen Cadeauplatform',
    'Vraag een zakelijk account aan voor het ZoetBezorgen Cadeauplatform: cadeau kiezen, ontvanger invoeren, personaliseren — wij verzorgen de verzending.',
    'a71c4f52d0b94b2f9d3ee65c8ab41f77', 0
  );

  INSERT INTO public.landing_page_variants (workspace_id, landing_page_id, variant_key, name, weight, active)
  VALUES (ws, pid, 'A', 'Master', 100, true);

  INSERT INTO public.landing_page_forms (
    workspace_id, landing_page_id, title, intro, submit_label, success_title, success_body, fields
  ) VALUES (
    ws, pid,
    'Vraag een zakelijk cadeauaccount aan',
    'Je ontvangt binnen één werkdag bericht over je aanvraag — zonder verplichtingen.',
    'Account aanvragen',
    'Bedankt voor je aanmelding',
    'We nemen je aanvraag door en nemen zo snel mogelijk contact met je op — meestal binnen één werkdag.',
    '[
      {"key":"company_name","label":"Bedrijfsnaam","type":"text","state":"required"},
      {"key":"contact_name","label":"Contactpersoon","type":"text","state":"required"},
      {"key":"email","label":"Zakelijk e-mailadres","type":"email","state":"required"},
      {"key":"phone","label":"Telefoonnummer","type":"tel","state":"required"},
      {"key":"website","label":"Website","type":"url","state":"optional"},
      {"key":"quantity","label":"Aantal ontvangers per keer (indicatie)","type":"number","state":"optional","placeholder":"bijv. 40"},
      {"key":"frequency","label":"Hoe vaak versturen jullie cadeaus?","type":"select","state":"optional","custom":true,
       "options":["Incidenteel","Een paar keer per jaar","Maandelijks","Wekelijks","Nog onbekend"]},
      {"key":"use_case","label":"Waarvoor wil je het platform gebruiken?","type":"multiselect","state":"optional","custom":true,
       "options":["Medewerkers","Relaties en klanten","Kerst en feestdagen","Jubilea","Welkomstcadeaus","Nog onbekend"]},
      {"key":"interests","label":"Soort geschenk / interesse","type":"multiselect","state":"optional",
       "options":["Puntzak snoep","Snoeppot","Bonbons","Chocoladeletter","Kerstgeschenk","Weet ik nog niet"]},
      {"key":"personalization","label":"Personalisatie gewenst","type":"boolean","state":"optional"},
      {"key":"delivery_date","label":"Eerste gewenste verzenddatum","type":"date","state":"hidden"},
      {"key":"budget","label":"Budgetindicatie per cadeau","type":"select","state":"optional",
       "options":["Tot € 10","€ 10 – € 20","€ 20 – € 35","€ 35 – € 50","Meer dan € 50","Nog onbekend"]},
      {"key":"message","label":"Toelichting","type":"textarea","state":"optional","placeholder":"Waar wil je cadeaus voor gaan versturen?"}
    ]'::jsonb
  );

  INSERT INTO public.landing_page_sections
    (workspace_id, landing_page_id, block_type, sort_order, enabled, use_global, variant_key, content)
  VALUES
  (ws, pid, 'hero', 10, true, false, 'A', jsonb_build_object(
    'badge','Zakelijk cadeauaccount',
    'title','Cadeaus voor medewerkers en relaties — centraal geregeld',
    'subtitle','Kies een cadeau, voer de ontvanger en het adres in, personaliseer het en wij verzorgen de verzending. Voor één keer of het hele jaar door.',
    'cta_label','Account aanvragen','cta_url','#offerte',
    'secondary_cta_label','Bekijk cadeauvoorbeelden','secondary_cta_url','#producten',
    'footnote','100% vrijblijvend · reactie binnen 1 werkdag',
    'image_url',a_hero,'image_alt','Zakelijke snoep- en chocoladecadeaus van ZoetBezorgen',
    'image_badge','Met jullie logo & kaartje',
    'image_url_2',a_pot,
    'design',jsonb_build_object('background','cream','composition','candy_hero_collage','emphasis','high')
  )),
  (ws, pid, 'usps', 20, true, false, 'A', jsonb_build_object(
    'items',jsonb_build_array(
      jsonb_build_object('title','Zelf cadeau kiezen','text','Kies uit onze zakelijke cadeaus en combineer naar wens.'),
      jsonb_build_object('title','Ontvanger invoeren','text','Naar één locatie of rechtstreeks naar huisadressen.'),
      jsonb_build_object('title','Zelf personaliseren','text','Eigen logo, kleuren en een persoonlijk kaartje.'),
      jsonb_build_object('title','Wij verzenden','text','Wij maken, verpakken en bezorgen op de afgesproken datum.')
    ),
    'design',jsonb_build_object('background','cream','composition','usp_strip')
  )),
  (ws, pid, 'intro', 30, true, false, 'A', jsonb_build_object(
    'title','Cadeaus versturen zonder rompslomp',
    'body','In het Cadeauplatform regel je zakelijke cadeaus vanaf één plek: cadeau kiezen, ontvangers en adressen invoeren, personaliseren en verzenden. Of je nu één keer per jaar een team verrast of maandelijks cadeaus verstuurt — je houdt overzicht over je bestellingen en wij zorgen voor de uitvoering.',
    'image_url',a_pot,'image_alt','Gepersonaliseerde snoeppot van ZoetBezorgen',
    'design',jsonb_build_object('background','cream','composition','industry_story_split')
  )),
  (ws, pid, 'how_it_works', 40, true, false, 'A', jsonb_build_object(
    'title','Zo werkt het Cadeauplatform',
    'subtitle','Vier stappen, van keuze tot bezorging.',
    'items',jsonb_build_array(
      jsonb_build_object('title','1. Cadeau kiezen','text','Kies een cadeau of laat ons meedenken over de samenstelling.'),
      jsonb_build_object('title','2. Ontvanger & adres','text','Voer één adres in of upload de adressen van je ontvangers.'),
      jsonb_build_object('title','3. Personaliseren','text','Voeg jullie logo, huisstijl en een persoonlijk kaartje toe.'),
      jsonb_build_object('title','4. Wij verzenden','text','Wij maken, verpakken en bezorgen op de gewenste datum.')
    ),
    'design',jsonb_build_object('background','cream','composition','steps_dots')
  )),
  (ws, pid, 'products', 50, true, false, 'A', jsonb_build_object(
    'title','Cadeauvoorbeelden',
    'subtitle','Alles is te combineren en te personaliseren.',
    'gallery',jsonb_build_array(
      jsonb_build_object('url',a_bel,'caption','Chocolade kerstbel'),
      jsonb_build_object('url',a_bon,'caption','Luxe bonbons 12 stuks'),
      jsonb_build_object('url',a_punt,'caption','Puntzak snoepmix Teamwork'),
      jsonb_build_object('url',a_sint,'caption','Sint strooigoed'),
      jsonb_build_object('url',a_team,'caption','Teamwork snoeppakket'),
      jsonb_build_object('url',a_weck,'caption','Snoeppot weck'),
      jsonb_build_object('url',a_dream,'caption','Teamwork makes the Dream work'),
      jsonb_build_object('url',a_pot,'caption','Gefeliciteerd Pot'),
      jsonb_build_object('url',a_hero,'caption','Snoeppakket op locatie'),
      jsonb_build_object('url',a_groet,'caption','Groeten van de Sint')
    ),
    'design',jsonb_build_object('background','cream','composition','product_showcase_polaroids')
  )),
  (ws, pid, 'personalization', 60, true, false, 'A', jsonb_build_object(
    'title','Personaliseren doe je zelf',
    'body','Van een sticker met jullie logo tot een volledig eigen doos met een persoonlijk kaartje per ontvanger.',
    'items',jsonb_build_array(
      jsonb_build_object('title','Logo & huisstijl','text','Sticker, banderol, wikkel of volledig bedrukte doos.'),
      jsonb_build_object('title','Persoonlijk kaartje','text','Eén tekst voor iedereen of per ontvanger een eigen boodschap.'),
      jsonb_build_object('title','Eigen samenstelling','text','Kies zelf de mix van snoep, chocolade en bonbons.')
    ),
    'image_url',a_pot,'image_alt','Gepersonaliseerd cadeau met eigen kaartje',
    'design',jsonb_build_object('background','plain','composition','editorial_split')
  )),
  (ws, pid, 'use_cases', 70, true, false, 'A', jsonb_build_object(
    'badge','Waarvoor bedrijven het gebruiken',
    'title','Momenten om cadeaus te versturen',
    'items',jsonb_build_array(
      jsonb_build_object('title','Medewerkers bedanken','text','Na een drukke periode of geslaagd project.','image_url',a_hero),
      jsonb_build_object('title','Kerst & feestdagen','text','Persoonlijk en praktisch, ook naar huisadressen.','image_url',a_bel),
      jsonb_build_object('title','Jubileum','text','Voor het bedrijf, een team of een individuele medewerker.','image_url',a_pot),
      jsonb_build_object('title','Relaties bedanken','text','Klanten, opdrachtgevers en leveranciers.','image_url',a_dream)
    ),
    'image_url',a_hero,'image_url_2',a_bel,'image_url_3',a_pot,'image_url_4',a_dream,
    'image_alt','Medewerkers bedanken met een zoet cadeau',
    'image_alt_2','Chocolade kerstbel als kerstgeschenk',
    'image_alt_3','Snoeppot voor een jubileum',
    'image_alt_4','Teamwork snoeppakket voor relaties',
    'design',jsonb_build_object('background','blush','composition','industry_story_moments')
  )),
  (ws, pid, 'why_us', 80, true, false, 'A', jsonb_build_object(
    'title','Waarom via het Cadeauplatform',
    'items',jsonb_build_array(
      jsonb_build_object('title','Zakelijke omgeving','text','Eén plek voor je cadeaus, ontvangers en personalisatie.'),
      jsonb_build_object('title','Overzicht van bestellingen','text','Je ziet wat je hebt verstuurd en wat er loopt.'),
      jsonb_build_object('title','Centraal geregeld','text','Eén factuur, duidelijke levertijden, vaste contactpersoon.')
    ),
    'design',jsonb_build_object('background','ink','composition','trust_strip')
  )),
  (ws, pid, 'social_proof', 90, true, false, 'A', jsonb_build_object(
    'title','Meer dan 1000+ bedrijven gingen je al voor',
    'subtitle','Van bouwbedrijf tot zorginstelling — zij verrassen hun teams en relaties met ZoetBezorgen.',
    'stats',jsonb_build_array(
      jsonb_build_object('value','1000+','label','bedrijven gingen je voor'),
      jsonb_build_object('value','9,4 / 10','label','WebwinkelKeur score'),
      jsonb_build_object('value','2.500+','label','klantreviews')
    ),
    'logos',jsonb_build_array(
      jsonb_build_object('alt','Achmea','url','https://zoetbezorgen.nl/cdn/shop/files/achmea.avif?v=1782854673'),
      jsonb_build_object('alt','Ziggo','url','https://zoetbezorgen.nl/cdn/shop/files/ziggo.avif?v=1782854812'),
      jsonb_build_object('alt','Normec','url','https://zoetbezorgen.nl/cdn/shop/files/normec.avif?v=1782854819'),
      jsonb_build_object('alt','Ministerie van Justitie en Veiligheid','url','https://zoetbezorgen.nl/cdn/shop/files/ministerie.avif?v=1782854812'),
      jsonb_build_object('alt','Floryn','url','https://zoetbezorgen.nl/cdn/shop/files/floryn.avif?v=1782854812'),
      jsonb_build_object('alt','Hogeschool Inholland','url','https://zoetbezorgen.nl/cdn/shop/files/inholland.avif?v=1782854812'),
      jsonb_build_object('alt','Flink','url','https://zoetbezorgen.nl/cdn/shop/files/flink.avif?v=1782854812'),
      jsonb_build_object('alt','Aafje','url','https://zoetbezorgen.nl/cdn/shop/files/aafje.avif?v=1782854812'),
      jsonb_build_object('alt','Belastingdienst','url','https://zoetbezorgen.nl/cdn/shop/files/belastingdienst.avif?v=1782854812'),
      jsonb_build_object('alt','Universiteit Twente','url','https://zoetbezorgen.nl/cdn/shop/files/twente-uni.avif?v=1782854812'),
      jsonb_build_object('alt','SSI','url','https://zoetbezorgen.nl/cdn/shop/files/Logo_SSI.webp?v=1782854812')
    ),
    'design',jsonb_build_object('background','plain','composition','logo_cloud_stats')
  )),
  (ws, pid, 'testimonials', 100, false, false, 'A', jsonb_build_object(
    'badge','Wat klanten zeggen','title','Wat opdrachtgevers zeggen',
    'design',jsonb_build_object('background','blush','composition','testimonial_cards')
  )),
  (ws, pid, 'faq', 110, true, false, 'A', jsonb_build_object(
    'title','Veelgestelde vragen',
    'items',jsonb_build_array(
      jsonb_build_object('title','Wat is de minimale afname?','text','Vanaf 25 stuks. Voor grotere aantallen geldt een staffelprijs.'),
      jsonb_build_object('title','Kan ik naar huisadressen leveren?','text','Ja, wij versturen ook individueel naar medewerkers thuis.'),
      jsonb_build_object('title','Hoe snel kan het?','text','Standaard 10 werkdagen; spoed is in overleg vaak mogelijk.'),
      jsonb_build_object('title','Kan ik eerst een proef ontvangen?','text','Ja, we sturen graag een sample met jullie personalisatie.'),
      jsonb_build_object('title','Moet ik meteen vaak cadeaus versturen?','text','Nee. Het platform is geschikt voor incidenteel én voor vaker cadeaus versturen.')
    ),
    'design',jsonb_build_object('background','cream','composition','default')
  )),
  (ws, pid, 'cta_banner', 120, true, false, 'A', jsonb_build_object(
    'title','Klaar om cadeaus centraal te regelen?',
    'body','Vraag een zakelijk account aan — vrijblijvend en binnen één werkdag reactie.',
    'cta_label','Account aanvragen','cta_url','#offerte',
    'image_url',a_hero,'image_alt','Zakelijke cadeaus van ZoetBezorgen',
    'design',jsonb_build_object('background','ink','composition','editorial_cta')
  )),
  (ws, pid, 'form', 130, true, false, 'A', jsonb_build_object(
    'badge','Gratis account aanvragen',
    'title','Vraag een zakelijk cadeauaccount aan',
    'subtitle','Je gegevens gebruiken we uitsluitend voor deze aanvraag.',
    'items',jsonb_build_array(
      jsonb_build_object('title','Reactie binnen 1 werkdag'),
      jsonb_build_object('title','100% vrijblijvend, geen verplichting'),
      jsonb_build_object('title','Bezorging op elk adres in Nederland'),
      jsonb_build_object('title','Eigen logo of persoonlijk kaartje mogelijk')
    ),
    'footnote','100% vrijblijvend · reactie binnen 1 werkdag · geen verplichtingen',
    'design',jsonb_build_object('background','cream','composition','premium_form')
  ));
END $$;