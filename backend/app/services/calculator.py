
from itertools import product
from typing import Dict, List, Optional

from app.services.data import (
    STAT_KEYS,
    characteristic_meta,
    introduced_generation,
    nature_modifiers,
    old_gen_effort_term,
    pokemon_summary,
)

STAT_LABELS = {
    "hp": "HP",
    "attack": "ATK",
    "defense": "DEF",
    "special-attack": "SPATK",
    "special-defense": "SPDEF",
    "speed": "SPD",
}


def calculate_stat_modern(stat_key: str, base_stat: int, iv: int, ev: int, level: int, nature_modifier: float) -> int:
    ev_term = ev // 4
    if stat_key == "hp":
        if base_stat == 1:
            return 1
        return ((2 * base_stat + iv + ev_term) * level) // 100 + level + 10
    raw = ((2 * base_stat + iv + ev_term) * level) // 100 + 5
    return int(raw * nature_modifier)


def calculate_stat_old(stat_key: str, base_stat: int, dv: int, stat_exp: int, level: int) -> int:
    effort_term = old_gen_effort_term(stat_exp)
    if stat_key == "hp":
        return (((base_stat + dv) * 2 + effort_term) * level) // 100 + level + 10
    return (((base_stat + dv) * 2 + effort_term) * level) // 100 + 5


def hp_dv_from_tuple(attack_dv: int, defense_dv: int, speed_dv: int, special_dv: int) -> int:
    return ((attack_dv & 1) << 3) | ((defense_dv & 1) << 2) | ((speed_dv & 1) << 1) | (special_dv & 1)


def describe_quality(candidates: List[int], max_value: int) -> str:
    if not candidates:
        return "No match"
    if len(candidates) == 1 and candidates[0] == max_value:
        return "Perfect"
    if max_value in candidates:
        return "Perfect possible"
    best = max(candidates)
    if len(candidates) > 8:
        return "Wide range"
    if best >= round(max_value * 0.875):
        return "Elite"
    if best >= round(max_value * 0.75):
        return "Strong"
    if best >= round(max_value * 0.5):
        return "Decent"
    return "Low"


def _filter_with_characteristic(candidates: Dict[str, List[int]], characteristic_name: Optional[str]) -> Dict[str, List[int]]:
    stat_key, modulo = characteristic_meta(characteristic_name)
    if not stat_key or modulo is None:
        return candidates

    target_candidates = candidates.get(stat_key, [])
    valid_target = [
        iv for iv in target_candidates
        if iv % 5 == modulo and all(any(other <= iv for other in vals) for key, vals in candidates.items() if key != stat_key)
    ]
    if not valid_target:
        return {key: [] for key in candidates}

    filtered = {stat_key: valid_target}
    for key, vals in candidates.items():
        if key == stat_key:
            continue
        filtered[key] = [v for v in vals if any(v <= tv for tv in valid_target)]
    return filtered


def _calculate_old_generation_candidates(
    generation: int,
    base_stats: Dict[str, int],
    level: int,
    observed_stats: Dict[str, int],
    effort_values: Dict[str, int],
) -> Dict[str, List[int]]:
    attack_vals = [dv for dv in range(16) if calculate_stat_old("attack", base_stats["attack"], dv, effort_values["attack"], level) == observed_stats["attack"]]
    defense_vals = [dv for dv in range(16) if calculate_stat_old("defense", base_stats["defense"], dv, effort_values["defense"], level) == observed_stats["defense"]]
    speed_vals = [dv for dv in range(16) if calculate_stat_old("speed", base_stats["speed"], dv, effort_values["speed"], level) == observed_stats["speed"]]

    if generation == 1:
        special_vals = [
            dv for dv in range(16)
            if calculate_stat_old("special-attack", base_stats["special-attack"], dv, effort_values["special-attack"], level) == observed_stats["special-attack"]
        ]
    else:
        special_vals = [
            dv for dv in range(16)
            if calculate_stat_old("special-attack", base_stats["special-attack"], dv, effort_values["special-attack"], level) == observed_stats["special-attack"]
            and calculate_stat_old("special-defense", base_stats["special-defense"], dv, effort_values["special-defense"], level) == observed_stats["special-defense"]
        ]

    valid_tuples = []
    hp_vals = set()
    for atk, defe, spe, spc in product(attack_vals, defense_vals, speed_vals, special_vals):
        hp_dv = hp_dv_from_tuple(atk, defe, spe, spc)
        hp_calc = calculate_stat_old("hp", base_stats["hp"], hp_dv, effort_values["hp"], level)
        if hp_calc == observed_stats["hp"]:
            valid_tuples.append((atk, defe, spe, spc, hp_dv))
            hp_vals.add(hp_dv)

    if not valid_tuples:
        return {key: [] for key in STAT_KEYS}

    attack_valid = sorted({t[0] for t in valid_tuples})
    defense_valid = sorted({t[1] for t in valid_tuples})
    speed_valid = sorted({t[2] for t in valid_tuples})
    special_valid = sorted({t[3] for t in valid_tuples})
    hp_valid = sorted(hp_vals)

    return {
        "hp": hp_valid,
        "attack": attack_valid,
        "defense": defense_valid,
        "special-attack": special_valid,
        "special-defense": special_valid,
        "speed": speed_valid,
    }


def calculate(
    pokemon_name: str,
    generation: int,
    level: int,
    nature_name: Optional[str],
    characteristic_name: Optional[str],
    observed_stats: Dict[str, int],
    effort_values: Dict[str, int],
) -> Dict[str, object]:
    intro_gen = introduced_generation(pokemon_name)
    if intro_gen > generation:
        raise ValueError(f"{pokemon_name.title()} was introduced in Generation {intro_gen}.")

    summary = pokemon_summary(pokemon_name, generation)
    base_stats = summary["base_stats"]

    generation_notes: List[str] = []
    uses_dv_rules = generation in {1, 2}
    nature_enabled = generation >= 3
    characteristic_enabled = generation >= 4
    historical_cached = generation <= 2

    if generation in {1, 2}:
        generation_notes.append("Generation 1-2 mode uses DVs (0-15) and Stat Exp (0-65535).")
        generation_notes.append("HP DV is derived from Attack, Defense, Speed, and Special DVs.")
    if generation == 1:
        generation_notes.append("Generation 1 uses a single Special stat.")
    if generation < 3:
        generation_notes.append("Natures are disabled in this generation.")
    if generation < 4:
        generation_notes.append("Characteristics are disabled in this generation.")
    if generation <= 2:
        generation_notes.append("Historical base stats are loaded from the local cache when available and fetched/cached on demand otherwise.")

    if generation == 1:
        if observed_stats["special-attack"] != observed_stats["special-defense"]:
            observed_stats = {**observed_stats, "special-defense": observed_stats["special-attack"]}
        if effort_values["special-attack"] != effort_values["special-defense"]:
            effort_values = {**effort_values, "special-defense": effort_values["special-attack"]}

    modifiers = nature_modifiers(nature_name) if nature_enabled and nature_name else {key: 1.0 for key in STAT_KEYS}
    max_value = 15 if uses_dv_rules else 31

    if uses_dv_rules:
        candidates = _calculate_old_generation_candidates(generation, base_stats, level, observed_stats, effort_values)
    else:
        candidates: Dict[str, List[int]] = {}
        for stat_key in STAT_KEYS:
            stat_candidates = []
            for candidate in range(max_value + 1):
                calc = calculate_stat_modern(stat_key, base_stats[stat_key], candidate, effort_values[stat_key], level, modifiers[stat_key])
                if calc == observed_stats[stat_key]:
                    stat_candidates.append(candidate)
            candidates[stat_key] = stat_candidates

        if characteristic_enabled and characteristic_name and characteristic_name != "No Selection":
            candidates = _filter_with_characteristic(candidates, characteristic_name)

    return _format_response(summary, generation, candidates, _status_text(candidates, summary["name"], level), generation_notes)


def _status_text(candidates: Dict[str, List[int]], name: str, level: int) -> str:
    impossible_count = sum(1 for vals in candidates.values() if not vals)
    if impossible_count:
        return f"Calculated with {impossible_count} impossible stat slot(s). Double-check inputs."
    return f"Calculation complete for {name} at level {level}."


def _format_response(summary: Dict[str, object], generation: int, candidates: Dict[str, List[int]], status: str, generation_notes: List[str]) -> Dict[str, object]:
    uses_dv_rules = generation in {1, 2}
    max_value = 15 if uses_dv_rules else 31

    iv_ranges: Dict[str, str] = {}
    quality: Dict[str, str] = {}
    bars: Dict[str, float] = {}
    exact_values: Dict[str, List[int]] = {}
    perfect_stats: List[str] = []
    best_stat = None
    best_value = -1

    for stat_key, vals in candidates.items():
        vals = sorted(vals)
        exact_values[stat_key] = vals
        if not vals:
            iv_ranges[stat_key] = "N/A"
            quality[stat_key] = "No match"
            bars[stat_key] = 0.0
            continue

        iv_ranges[stat_key] = str(vals[0]) if len(vals) == 1 else f"{vals[0]}-{vals[-1]}"
        quality[stat_key] = describe_quality(vals, max_value)
        bars[stat_key] = vals[-1] / max_value
        if len(vals) == 1 and vals[0] == max_value:
            perfect_stats.append(STAT_LABELS[stat_key])
        if vals[-1] > best_value:
            best_value = vals[-1]
            best_stat = STAT_LABELS[stat_key]

    best_match = f"{best_stat} at up to {best_value}" if best_stat else "None"

    return {
        "generation": generation,
        "pokemon": summary,
        "iv_ranges": iv_ranges,
        "quality": quality,
        "bars": bars,
        "exact_values": exact_values,
        "best_match": best_match,
        "perfect_stats": perfect_stats,
        "status": status,
        "generation_notes": generation_notes,
    }
