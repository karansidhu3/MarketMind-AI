"""Pre-seeded bottleneck theses. Inserted at startup if the theses table is empty."""
from __future__ import annotations

SYSTEM_THESES = [
    {
        "name": "AI Infrastructure Bottlenecks",
        "description": (
            "AI training and inference demand is straining physical infrastructure. "
            "Companies supplying power, cooling, networking, and facility capacity "
            "are becoming critical constraints and investment opportunities."
        ),
        "keywords": [
            "power capacity", "electricity", "grid", "transformer", "utility",
            "capacity constraints", "data center", "infrastructure", "lead time",
            "power demand", "electrical switchgear", "substation",
        ],
    },
    {
        "name": "Semiconductor Supply Chain",
        "description": (
            "Advanced semiconductor manufacturing relies on a concentrated set of "
            "suppliers for packaging, materials, and equipment. Bottlenecks in any "
            "link create outsized opportunities for the companies that solve them."
        ),
        "keywords": [
            "semiconductor", "packaging", "CoWoS", "HBM", "advanced packaging",
            "TSMC", "yield", "wafer", "chiplet", "substrate", "fab capacity",
            "equipment", "EUV", "lithography",
        ],
    },
    {
        "name": "Energy Grid Modernization",
        "description": (
            "Ageing grid infrastructure combined with electrification demand is forcing "
            "a multi-decade upgrade cycle. Interconnection queues, transformer lead times, "
            "and substation upgrades are the near-term constraints."
        ),
        "keywords": [
            "grid upgrade", "interconnection queue", "transformer lead time",
            "substation", "transmission", "distribution", "grid modernization",
            "electrification", "utility scale", "load growth", "long lead time",
        ],
    },
    {
        "name": "Defense Production Ramp",
        "description": (
            "Geopolitical tensions are driving a sustained increase in defense budgets "
            "globally. Production capacity for munitions, platforms, and electronics "
            "cannot keep pace with demand — creating durable revenue visibility for suppliers."
        ),
        "keywords": [
            "defense spending", "munitions", "replenishment", "production capacity",
            "defense contract", "military", "DoD", "NATO", "artillery", "missile",
            "hypersonic", "unmanned", "drone", "shipbuilding",
        ],
    },
    {
        "name": "Data Center Physical Infrastructure",
        "description": (
            "Hyperscaler capex is accelerating but physical build-out is constrained by "
            "cooling, power density limits, and facility construction timelines. "
            "Thermal management and liquid cooling are the near-term constraints."
        ),
        "keywords": [
            "cooling", "liquid cooling", "thermal management", "PUE", "power density",
            "hyperscaler", "colocation", "facility", "data center construction",
            "immersion cooling", "cold plate", "heat exchanger",
        ],
    },
]
