# Clay-First Pilot Scope

## Status

Accepted

## Context

Repository branding examples, development fixtures, and tests use Clay and Clay businesses. TownHub is intended to support many localities eventually, but the current beta strategy is to validate the product in one concentrated launch market before expanding.

## Decision

Use Clay as the first pilot locality and prioritize its business/customer workflows before geographic expansion. Keep town name, branding, photos, weather location, businesses, and community content configurable; do not hardcode Clay into reusable commerce or platform services. Multi-locality tenancy and operations must be designed explicitly when expansion begins rather than inferred from branding configuration alone.

## Consequences

- Work should favor pilot reliability, owner operations, security, and measurable local adoption over expansion features.
- Clay-specific content belongs in platform data/configuration, not general-purpose code.
- Successful Clay workflows should become the baseline for later locality onboarding.
- Configurable branding does not by itself provide locality-level data isolation, administration, routing, or billing; those capabilities require a future architectural decision.
