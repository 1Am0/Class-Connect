# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

High-school teachers using a classroom laptop or tablet to manage classes, students, and daily attendance. The interface must remain comfortable for a person who is not technically savvy.

## Product Purpose

Classroom combines RFID check-ins, manual attendance, class rosters, attendance history, and participation activities in one teacher workspace.

## Operating Context

Teachers move between classes during the school day. An ESP32 scanner can send check-ins while the classroom laptop and browser tab are running. Teachers can also change attendance manually, edit students, pick a student, and make groups. A local demo classroom supports previews.

## Capabilities and Constraints

Preserve teacher authentication, class switching, student records, scanner routing, realtime attendance, duplicate-scan handling, history, wheel selection, and groups. Light, dark, and system theme choices already exist. The product is built with Next.js and can use Supabase for production data.

## Brand Commitments

Use the Class Connect name and checkmark mark. Teachers can choose a coordinated color theme that softly tints the page and cards in light or dark mode. Functional attendance status colors and the colorful student wheel remain distinct from the chosen interface theme.

## Product Principles

- Make the teacher's next action obvious.
- Keep active class, scanner destination, and attendance state understandable.
- Let frequent classroom tasks be fast and forgiving.
- Add visual character without slowing down the working interface.

## Accessibility & Inclusion

Keep keyboard navigation, visible focus, readable light/dark contrast, reduced-motion behavior, and controls large enough for touch use.
