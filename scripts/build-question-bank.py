"""Render every upstream question from the pinned, local README into the blog."""
from pathlib import Path
import hashlib
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
START = '<!-- BEGIN GENERATED QUESTION BANK: run python3 scripts/build-question-bank.py -->'
END = '<!-- END GENERATED QUESTION BANK -->'


def read_sections(source):
    toc = source.split('## Table of Contents', 1)[1].split('### Prepared', 1)[0]
    topics = re.findall(r'^- \[(.+)\]\(#([^\n)]+)\)', toc, re.M)
    sections = []
    for title, slug in topics:
        match = re.search(r'^### ' + re.escape(title) + r'\s*\n(.*?)(?=^### |\Z)', source, re.M | re.S)
        if not match:
            raise ValueError(f'Missing upstream section: {title}')
        entries, notes = [], []
        for line in match[1].splitlines():
            if line.startswith('- '):
                entries.append({'question': line[2:], 'answers': []})
            elif line.startswith('  - Answer: '):
                if not entries:
                    raise ValueError(f'Answer without question: {title}')
                entries[-1]['answers'].append(line[len('  - Answer: '):])
            elif line.strip():
                notes.append(line.strip())
        if not entries:
            raise ValueError(f'Empty upstream section: {title}')
        sections.append({'title': title, 'slug': slug, 'entries': entries, 'notes': notes})
    return sections


def markdown_links(text):
    parts, position = [], 0
    for match in re.finditer(r'\[([^\]]+)\]\((https?://[^\s)]+)\)', text):
        parts.append(html.escape(text[position:match.start()]))
        parts.append(f'<a href="{html.escape(match[2], quote=True)}">{html.escape(match[1])}</a>')
        position = match.end()
    parts.append(html.escape(text[position:]))
    return ''.join(parts)


def validate_answers(sections, answers):
    expected = {
        f'{section["slug"]}-{number}': entry['question']
        for section in sections
        for number, entry in enumerate(section['entries'], 1)
    }
    if set(answers) != set(expected):
        raise ValueError(f'Answer coverage mismatch: missing {set(expected) - set(answers)}, extra {set(answers) - set(expected)}')
    for key, question in expected.items():
        item = answers[key]
        if item.get('question') != question:
            raise ValueError(f'Answer is paired with a different question: {key}')
        if not isinstance(item.get('answer'), str) or not item['answer'].strip():
            raise ValueError(f'Empty answer: {key}')
        for field in ['question_vi', 'question_ja', 'answer_en', 'answer_ja']:
            if not isinstance(item.get(field), str) or not item[field].strip():
                raise ValueError(f'Missing translation {field}: {key}')
        for reference in item.get('references', []):
            if not reference.get('title') or not reference.get('url', '').startswith('https://'):
                raise ValueError(f'Invalid answer reference: {key}')


def render_bank(sections, metadata, answers, lang, locales):
    ui = locales[lang]
    concepts = len(sections[0]['entries'])
    questions = sum(len(s['entries']) for s in sections[1:])
    total = questions + concepts
    repository = metadata['repository']
    commit = metadata['commit']
    source = f'{repository}/blob/{commit}/README.md'
    titles = dict(zip((s['slug'] for s in sections), ui['sections']))
    options = ''.join(f'<option value="{s["slug"]}">{html.escape(titles[s["slug"]])} ({len(s["entries"])})</option>' for s in sections)
    toc = '\n'.join(f'<li><a href="#{s["slug"]}">{html.escape(titles[s["slug"]])} <span>{len(s["entries"])}</span></a></li>' for s in sections)
    content = []
    for s in sections:
        entries = []
        for number, entry in enumerate(s['entries'], 1):
            anchor = f'{s["slug"]}-{number}'
            item = answers[anchor]
            answer = f'<p class="quick-answer" lang="{lang}">{html.escape(item[ui["answer_field"]])}</p>'
            resources = ''.join(f'<p lang="en">{markdown_links(a)}</p>' for a in entry['answers'])
            if s['slug'] == 'must-know':
                resources += ''.join(f'<p lang="en">{markdown_links(note)}</p>' for note in s['notes'])
            for reference in item.get('references', []):
                resources += f'<p><a href="{html.escape(reference["url"], quote=True)}">{html.escape(reference["title"])}</a></p>'
            if resources:
                answer += f'<div class="answer-reading"><h3>{ui["read_more"]}</h3>{resources}</div>'
            entries.append(f'''<details class="question-item" id="{anchor}" data-topic="{s['slug']}">
<summary><span class="question-number">{number:02d}</span><span lang="{lang}">{html.escape(item[ui['question_field']])}</span></summary>
<div class="question-resources">{answer}<a class="question-permalink" href="#{anchor}">{ui['permalink']}</a></div>
</details>''')
        label = ui['concept_unit'] if s['slug'] == 'must-know' else ui['question_unit']
        content.append(f'''<section class="question-section" id="{s['slug']}" aria-labelledby="heading-{s['slug']}">
<div class="question-section-heading"><h2 id="heading-{s['slug']}" lang="{lang}">{html.escape(titles[s['slug']])}</h2><span class="section-count">{len(s['entries'])} {label}</span></div>
{chr(10).join(entries)}
<a class="section-source" href="{source}#{s['slug']}">{ui['section_source']} ↗</a>
</section>''')
    return f'''<main id="main" data-entry-unit="{ui['entry_unit']}" data-section-unit="{ui['section_unit']}" data-entry-singular="{ui.get('entry_singular', ui['entry_unit'])}" data-section-singular="{ui.get('section_singular', ui['section_unit'])}">
<div class="blog-heading"><div><h1>AI Engineer<br><span>Interview Questions<span class="heading-dot">.</span></span></h1>
<p class="intro">{ui['intro']}</p>
<a class="source-link" href="{repository}">AI Engineering Interview Questions · Amit Shekhar ↗</a></div>
<div class="study-note"><span class="terminal-label">~/notes/interview</span><p>{ui['note']}<br><strong>{ui['note_strong']}</strong></p><span class="note-caption">{ui['caption']}</span></div></div>
<p class="bank-context">{ui['context']}</p>
<section class="library" aria-labelledby="library-title"><div class="library-heading"><h2 id="library-title">{ui['library']}</h2><span id="result-count" role="status" aria-live="polite">{total} {ui['entry_unit']} · {len(sections)} {ui['section_unit']}</span></div>
<form class="search-form" role="search"><label for="search">{ui['search']}</label><input id="search" type="search" placeholder="{ui['placeholder']}" autocomplete="off"></form>
<div class="topic-picker"><label for="topic-filter">{ui['filter']}</label><select id="topic-filter"><option value="all">{ui['all_sections']}</option>{options}</select></div>
<div class="bank-layout"><aside class="toc bank-toc" aria-label="{ui['contents']}"><p>{ui['contents']}</p><ol>{toc}</ol></aside><div class="question-bank">{chr(10).join(content)}
<div id="empty-state" hidden><h3>{ui['empty_title']}</h3><p>{ui['empty_text']}</p><button id="reset-search" type="button">{ui['reset']}</button></div></div></div></section>
</main>'''


def render_page(sections, metadata, answers, lang, locales):
    ui = locales[lang]
    alternates = ''.join(f'<link rel="alternate" hreflang="{code}" href="{locale["file"]}">' for code, locale in locales.items())
    languages = ''.join(
        f'<a href="{locales[code]["file"]}" data-language-link hreflang="{code}" lang="{code}"'
        + (' aria-current="page"' if code == lang else '')
        + f'>{locales[code]["name"]}</a>'
        for code in ['en', 'ja', 'vi']
    )
    return f'''<!DOCTYPE html>
<!-- Generated by scripts/build-question-bank.py. Edit answers.json, locales.json or the generator. -->
<html lang="{lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{ui['title']} | mark.dev</title><meta name="description" content="{ui['description']}">
<meta name="theme-color" content="#0a0e1a"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230a0e1a'/%3E%3Ctext x='7' y='24' fill='%2360a5fa' font-family='monospace' font-size='24'%3EM%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="blog.css">
{alternates}</head>
<body><a class="skip-link" href="#main">{ui['skip']}</a>
<header><nav aria-label="{ui['navigation']}"><a class="brand" href="../index.html"><span aria-hidden="true">&gt;</span> mark.dev<span class="cursor" aria-hidden="true"></span></a><div class="nav-links"><a href="../index.html">Portfolio</a><a href="{ui['file']}" aria-current="page">Blog</a></div><div class="language-switcher" role="group" aria-label="{ui['language_label']}">{languages}</div></nav></header>
{START}
{render_bank(sections, metadata, answers, lang, locales)}
{END}
<footer><span>© 2026 Tu Duc Manh · mark.dev</span><span><a href="{metadata['repository']}" aria-label="{ui['footer_source']}">© 2026 Outcome School</a> · <a href="source/LICENSE">Apache 2.0</a></span></footer>
<script src="blog.js" defer></script></body></html>
'''


def build():
    source = (ROOT / 'blog/source/README.md').read_text(encoding='utf-8')
    metadata = json.loads((ROOT / 'blog/source/provenance.json').read_text(encoding='utf-8'))
    if hashlib.sha256(source.encode()).hexdigest() != metadata['sha256']:
        raise ValueError('Source checksum does not match provenance.json')
    sections = read_sections(source)
    answers = json.loads((ROOT / 'blog/answers.json').read_text(encoding='utf-8'))
    locales = json.loads((ROOT / 'blog/locales.json').read_text(encoding='utf-8'))
    validate_answers(sections, answers)
    if set(locales) != {'vi', 'en', 'ja'}:
        raise ValueError('All three locales are required')
    for lang, ui in locales.items():
        if len(ui['sections']) != len(sections):
            raise ValueError(f'Section translation coverage mismatch: {lang}')
        (ROOT / 'blog' / ui['file']).write_text(render_page(sections, metadata, answers, lang, locales), encoding='utf-8')
    print(f'Rendered {len(sections)} sections, {sum(len(s["entries"]) for s in sections)} entries × {len(locales)} languages')


if __name__ == '__main__':
    build()
