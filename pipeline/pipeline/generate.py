"""Study-artifact generation grounded in a workspace's indexed passages.

LLM path (Claude) produces summaries / flashcards / quizzes as JSON; when no LLM
is configured, deterministic extractive fallbacks keep the feature working. Quiz
shapes match src/api/types.ts so the gateway can persist and the QuestionRunner
can render every type."""
from __future__ import annotations

import json
import re
import secrets
from typing import Any, Dict, List

from .ingest import concepts as concept_mod
from .ingest import normalize
from .llm.client import LLMClient


def _uid(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(4)}"


def _context(passages: List[Dict[str, Any]], limit: int = 16) -> str:
    return "\n\n".join(p["text"] for p in passages[:limit])


def _json_array(text: str) -> List[dict]:
    """Pull the first JSON array out of an LLM reply, tolerating prose around it."""
    if not text:
        return []
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if not m:
        return []
    try:
        data = json.loads(m.group(0))
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


# ----------------------------------------------------------------- summary

def build_summary(passages: List[Dict[str, Any]], opts: Dict[str, Any], llm: LLMClient) -> Dict[str, Any]:
    length = opts.get("length") or "standard"
    fmt = opts.get("format") or "bullets"
    if llm.available and passages:
        body = llm.complete(
            system="You summarize study material faithfully and concisely.",
            prompt=f"Write a {length} study summary in {fmt} form from these sources:\n\n{_context(passages)}",
        )
        if body:
            return {"kind": "summary", "title": "Summary", "body": body}

    sents: List[str] = []
    for p in passages:
        sents += normalize.split_sentences(p["text"])
    n = {"brief": 4, "standard": 8, "detailed": 14}.get(length, 8)
    picked = sents[:n]
    if fmt == "prose":
        body = " ".join(picked)
    else:
        body = "\n".join(("• " if fmt == "bullets" else f"{i + 1}. ") + s for i, s in enumerate(picked))
    return {"kind": "summary", "title": "Summary", "body": body or "No sources indexed yet."}


# --------------------------------------------------------------- flashcards

def build_flashcards(passages: List[Dict[str, Any]], opts: Dict[str, Any], llm: LLMClient) -> Dict[str, Any]:
    count = int(opts.get("count") or 10)
    if llm.available and passages:
        raw = llm.complete(
            system="You create concise study flashcards.",
            prompt=(
                f"Create {count} flashcards from these sources as a JSON array of "
                f'objects with keys "front" and "back". Return ONLY JSON.\n\n{_context(passages)}'
            ),
        )
        cards = _json_array(raw)
        if cards:
            return {"kind": "flashcards", "cards": [
                {"id": _uid("c"), "deckId": "generated", "front": str(c.get("front", "")), "back": str(c.get("back", "")), "known": False}
                for c in cards[:count] if c.get("front")
            ]}

    cards: List[dict] = []
    seen = set()
    for p in passages:
        for s in normalize.split_sentences(p["text"]):
            for c in concept_mod.extract_concepts(s, max_n=2):
                if c in seen:
                    continue
                seen.add(c)
                cards.append({"id": _uid("c"), "deckId": "generated", "front": c.title(), "back": s, "known": False})
                if len(cards) >= count:
                    return {"kind": "flashcards", "cards": cards}
    return {"kind": "flashcards", "cards": cards}


# -------------------------------------------------------------------- quiz

_VALID_TYPES = {"mcq", "multi", "boolean", "fill", "short", "matching", "ordering"}


def _norm_question(q: dict) -> Dict[str, Any] | None:
    t = q.get("type")
    if t not in _VALID_TYPES or not q.get("prompt"):
        return None
    base = {"id": _uid("q"), "type": t, "difficulty": q.get("difficulty", "medium"), "prompt": str(q["prompt"])}
    if q.get("explanation"):
        base["explanation"] = str(q["explanation"])
    if t in ("mcq", "multi"):
        opts = [str(o) for o in q.get("options", [])]
        correct = [int(i) for i in q.get("correct", []) if isinstance(i, (int, float))]
        if len(opts) < 2 or not correct:
            return None
        base["options"], base["correct"] = opts, correct
    elif t == "boolean":
        base["correct"] = bool(q.get("correct"))
    elif t in ("fill", "short"):
        acc = [str(a) for a in q.get("accepted", []) if str(a).strip()]
        if not acc:
            return None
        base["accepted"] = acc
    elif t == "matching":
        pairs = [{"left": str(p.get("left", "")), "right": str(p.get("right", ""))} for p in q.get("pairs", [])]
        if len(pairs) < 2:
            return None
        base["pairs"] = pairs
    elif t == "ordering":
        items = [str(i) for i in q.get("items", [])]
        if len(items) < 2:
            return None
        base["items"] = items
    return base


def _quiz_prompt(count: int, types: List[str], diffs: List[str], context: str) -> str:
    schema = (
        'Each question is an object with: "type" (one of mcq, multi, boolean, fill, short, '
        'matching, ordering), "difficulty" (easy|medium|hard), "prompt", and per type: '
        'mcq/multi -> "options" (string[]) + "correct" (index[]); boolean -> "correct" (bool); '
        'fill/short -> "accepted" (string[]); matching -> "pairs" ([{left,right}]); '
        'ordering -> "items" (string[] in correct order). Optionally "explanation".'
    )
    return (
        f"Write {count} quiz questions grounded ONLY in the sources. "
        f"Use these types: {', '.join(types)}. Mix difficulties: {', '.join(diffs)}. "
        f"Return ONLY a JSON array. {schema}\n\nSources:\n{context}"
    )


def _extractive_quiz(passages: List[Dict[str, Any]], count: int, types: List[str], diffs: List[str]) -> List[dict]:
    sents: List[str] = []
    for p in passages:
        sents += normalize.split_sentences(p["text"])
    pool = sorted({c for s in sents for c in concept_mod.extract_concepts(s, max_n=3)})
    out: List[dict] = []
    i = 0
    for s in sents:
        if len(out) >= count:
            break
        cs = concept_mod.extract_concepts(s, max_n=1)
        if not cs:
            continue
        concept = cs[0]
        t = types[i % len(types)] if types else "fill"
        d = diffs[len(out) % len(diffs)] if diffs else "medium"
        i += 1
        if t == "boolean":
            out.append({"id": _uid("q"), "type": "boolean", "difficulty": d, "prompt": s, "correct": True})
        elif t == "mcq" and len(pool) >= 4:
            distractors = [c for c in pool if c != concept][:3]
            options = [concept.title()] + [x.title() for x in distractors]
            out.append({"id": _uid("q"), "type": "mcq", "difficulty": d, "prompt": _blank(s, concept),
                        "options": options, "correct": [0]})
        elif t == "short":
            out.append({"id": _uid("q"), "type": "short", "difficulty": d, "prompt": s.replace(concept, "____", 1),
                        "accepted": [concept]})
        else:  # fill (default + fallback for matching/ordering/multi we can't reliably build)
            out.append({"id": _uid("q"), "type": "fill", "difficulty": d, "prompt": _blank(s, concept),
                        "accepted": [concept]})
    return out


def _blank(sentence: str, concept: str) -> str:
    pattern = re.compile(re.escape(concept), re.IGNORECASE)
    return pattern.sub("____", sentence, count=1)


def build_quiz(passages: List[Dict[str, Any]], opts: Dict[str, Any], llm: LLMClient) -> Dict[str, Any]:
    count = int(opts.get("count") or 5)
    types = opts.get("types") or ["mcq", "boolean"]
    diffs = opts.get("difficulty") or ["medium"]
    questions: List[dict] = []
    if llm.available and passages:
        raw = llm.complete(
            system="You write accurate quiz questions grounded strictly in the sources. Return ONLY JSON.",
            prompt=_quiz_prompt(count, types, diffs, _context(passages)),
            max_tokens=2048,
        )
        questions = [q for q in (_norm_question(x) for x in _json_array(raw)) if q]
    if not questions:
        questions = _extractive_quiz(passages, count, types, diffs)
    return {
        "kind": "quiz",
        "name": "Generated quiz",
        "chapters": opts.get("chapters") or [],
        "questions": questions[:count],
        "timeLimitMin": opts.get("timeLimitMin"),
    }


def generate(kind: str, passages: List[Dict[str, Any]], opts: Dict[str, Any], llm: LLMClient) -> Dict[str, Any]:
    if kind == "summary":
        return build_summary(passages, opts, llm)
    if kind == "flashcards":
        return build_flashcards(passages, opts, llm)
    return build_quiz(passages, opts, llm)
