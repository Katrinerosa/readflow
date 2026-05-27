# Ændringslog

## 1.2 — april 2026

Denne leverance dækker det aftalte scope plus en række supplerende forbedringer.

## Leverance i forhold til aftalt scope

### 1. Automatiseret lydproduktion

Automatiseret løsning til generering af lyd via integration med ElevenLabs og Directus CMS.

- Tekst opdeles automatisk i afsnit og ord
- Unikke tekststykker sendes til lydproduktion via ElevenLabs
- Lyd genereres løbende og lagres til genbrug
- Kun nye eller ændrede elementer produceres
- Lyd kan afspilles direkte i readeren

Løsningen er integreret i det redaktionelle workflow og understøtter løbende opbygning af lydindhold.

### 2. Ordfortolkning i læseoplevelsen

Funktion til ordforklaringer er implementeret direkte i læseoplevelsen.

- Ordforklaringer vises i readeren ved interaktion med teksten
- Indhold administreres via CMS
- Understøtter forskellige LIX-niveauer
- Mulighed for at tilknytte flere ordvarianter til samme forklaring (fx bøjningsformer og flertal)

Funktionen reducerer afbrydelser i læseflowet og understøtter en mere sammenhængende læseoplevelse.

### 3. Onboarding til læseoplevelsen

Onboarding er implementeret for at introducere brugeren til løsningen.

- Forside med onboarding-flow bestående af video samt sektionen "Sådan fungerer det" i tre trin
- Introduktion til valg af læseniveau via "Udvalgte bøger"
- Guidende onboarding i reader via diskrete hints til funktioner som læseindstillinger, kapitler, fuldskærm og feedback
- Hints vises gradvist over tid, så brugeren ikke overvældes

Onboardingen understøtter en tryg og intuitiv introduktion til systemet.

## Supplerende leverancer (udover aftalt scope)

Følgende forbedringer er leveret ud over det aftalte scope:

- Redesign af forside og visuelt udtryk
- Opdatering af logo, ikon og typografi
- Forbedret læsbarhed med fokus på målgruppen
- Justeringer i reader (interaktion, navigation og brugeroplevelse)
- Fjernelse af højtalerikoner og forbedret interaktion med tekst
- Optimering af brugerflow og reducering af fejlklik

## Tekniske opdateringer

Den underliggende platform er moderniseret:

- Directus opgraderet fra 11.13 til 11.17
- Konsolidering af Docker Compose-opsætning (fra 4 filer til 2)
- Forenklet miljøkonfiguration (én samlet `.env`)
- Komplet databasebackup + uploads (522 MB) inkluderet i denne leverance til lokal restore
