---
name: mark.dev
description: Navy and blue pixel portfolio with a complete AI engineering interview question bank and Vietnamese reading notes.
colors:
  bg: "#0a0e1a"
  surface: "#10182a"
  text: "#d5dfef"
  muted: "#9baecb"
  blue: "#86b9ff"
  line: "#263a56"
  portfolio-blue: "#60a5fa"
  cyan: "#22d3ee"
typography:
  display:
    fontFamily: "Silkscreen, monospace"
    fontSize: "clamp(26px, 3.5vw, 44px)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Noto Sans, sans-serif"
    fontSize: "16px"
    lineHeight: 1.8
  label:
    fontFamily: "JetBrains Mono, monospace"
rounded:
  control: "4px"
  note: "6px"
spacing:
  small: "8px"
  medium: "16px"
  gutter: "24px"
components:
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
  filter:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "9px 13px"
---

# Design System: mark.dev

## Overview

The incumbent portfolio combines a dark navy canvas, blue light, pixel display lettering, and terminal-like navigation. The blog extends that identity into a quieter reading surface: the same canvas and type families, stronger text contrast, and simple ruled article rows. These notes describe the shipped HTML and CSS, not a proposed redesign.

**Key Characteristics:**

- Pixel headings establish identity; sans-serif text carries extended reading.
- Monospaced navigation, metadata, and topic controls connect the blog to the portfolio.
- Blue identifies links and interaction; thin borders organize content.

## Colors

Primary blue is brighter and lighter in the blog than the portfolio accent. Cyan supplies small supporting accents. Navy background and slightly lighter surfaces keep the site dark throughout; pale text and muted blue-gray distinguish primary reading from metadata. The frontmatter records the blog's custom properties plus shared portfolio accents; portfolio text and border values remain in its inline stylesheet.

## Typography

Silkscreen supplies portfolio names, section headings, and the blog library title. The portfolio name uses a bold, larger display scale; the blog uses the lighter display role above. Article titles instead use Noto Sans at a responsive (32-54px) size and (1.24) line height. Blog body copy uses the body role above; article subheadings use (25px), reducing to (23px) on narrow screens. JetBrains Mono carries labels and navigation, generally (11-13px). The existing portfolio body uses Noto Sans JP with Helvetica fallbacks.

**The Reading Type Rule.** Preserve sans-serif article titles and body text; retain pixel lettering for the identity and library heading.

## Layout

Both surfaces center content within a maximum (1120px) width. Blog horizontal padding is (24px), reducing to (20px) below (480px). The library uses a heading beside a small study note, then search, a native section selector, and the complete question bank. The bank uses a (240px) sticky section index beside expandable question rows; the index is hidden at (760px) and below, where the selector remains available. Articles place a sticky (240px) contents sidebar beside prose limited to (72ch), with a (56px) gap. At (760px) and below, both layouts become single-column and the contents list returns to normal flow. At (480px) and below, topic labels move above each row's title. The portfolio retains its existing responsive grid and hamburger navigation.

## Elevation & Depth

The portfolio uses grid texture, scanlines, radial light, translucent surfaces, and blue hover glows. The blog uses solid surfaces and borders without box shadows, keeping long reading clear. Its sticky header and sidebar provide navigation rather than decorative elevation. Smooth anchor scrolling respects reduced-motion preferences.

## Shapes

Blog controls and expandable practice prompts have small, square-like corners using the control radius; the study note uses the note radius. Post rows and article sections are separated by thin horizontal rules. The portfolio additionally uses rounded terminal panels and a rounded pixel portrait with a circular orbit.

## Components

- **Navigation:** Terminal prompt, mark.dev label, blue cursor, muted links, and blue current-page state. The portfolio offers EN/VI/JP localization; the bank has complete Vietnamese, English and Japanese editions, including questions, answers and interface labels; the six explanatory articles are Vietnamese only.
- **Search and filters:** A full-width labeled search field precedes a native selector containing all fifteen upstream sections. Search covers both questions and answers, ignores accents and requires every term to match, combined with the selected section. Results announce matching entry and section counts; empty results provide a reset action. Matching sections and sidebar links remain visible.
- **Question rows:** Native disclosures show the question and concise answer in the selected language, its within-section number, optional reading links and a stable fragment link. The English edition preserves the original question text. Answers appear before supplementary sources. Direct links open and reveal the corresponding question. All 572 entries, including Must Know concepts, have individually authored answers; the original introductory resource remains available as further reading.
- **Reading:** Breadcrumb, article heading, anchored contents list, three question sections, practical examples, and native `details`/`summary` practice prompts. Preserve visible keyboard focus and the skip link.
- **Content maintenance:** The bank contains all 566 questions and six Must Know concepts across fifteen source sections. Keep `blog/source/README.md`, its Apache license and `provenance.json` together. The source is pinned to commit `72c6a77b55646065c31b47b42f733233d1c33f35`. Run `python3 scripts/build-question-bank.py` to regenerate `blog/index.html` (Vietnamese), `blog/en.html` and `blog/ja.html`; never edit these generated pages manually. The Node tests compare every question, section, order, per-question resource link, checksum and deterministic rebuild against the snapshot. Each question is paired with its authored answer in `blog/answers.json` using its stable ID and exact source question text. The builder refuses missing, empty or mismatched answers; edit the answer data and rebuild rather than changing generated HTML. Additional verified primary references live beside the corresponding answers. All 572 entries have `question_vi`, `question_ja`, `answer_en` and `answer_ja` translations; the existing `question` and `answer` fields preserve English questions and Vietnamese answers. `blog/locales.json` owns interface translations and section names. The header language links remain visible on mobile and preserve the currently opened question. Search normalizes full-width Latin characters and Vietnamese accents; counts use localized units. The bank ends after the question sections; source credit and the Apache license link are kept compactly in the footer. The six separate Vietnamese articles remain available through their existing URLs. The portfolio Blog section introduces the complete three-language question bank, with a primary entry link and RAG/Agents previews showing 42/54 questions; every preview follows the portfolio language and links into the matching bank section. When updating the source snapshot, update provenance, portfolio totals, metadata and parity-test counts together.

## Do's and Don'ts

- **Do** extend the existing navy, blue, and terminal vocabulary using the current HTML/CSS conventions.
- **Do** keep Vietnamese diacritics legible and verify single-column reading at narrow widths.
- **Do** retain semantic links, labels, keyboard focus, and native disclosure controls.
- **Don't** apply the portfolio's decorative overlays to the blog reading surface without checking legibility.
- **Don't** imply the six additional Vietnamese articles are translated; only the complete question bank has three language editions.
