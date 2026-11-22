# AIP-EVAL-01 offline benchmark

The benchmark feeds synthetic decisions into the accepted AIP-01 response contract using an injected mock transport. It uses the 11 existing AIP-01 cases and nine additional controls for private fields, unknown candidates, unsolicited executable fields, stale decisions and versions, refusal, timeout and explicit abstention.

The reference mock expects 12 legal selections, one abstention and seven rejections across 20 cases. A separate test substitutes an invented ID for an intended selection and expects one fewer passing case and one fewer valid selection. Privacy controls check that hidden actor, card, provider and role probes never reach the mock.

The report counts legal selections independently of synthetic preferences. The two rescue fixtures specify a preference, and other fixtures report `UNDERDETERMINED`. Timing is local test-process elapsed time. The fixture runner makes zero model calls and uses zero model tokens or API spend.

GitHub Actions runs the benchmark through the existing fast-test job. Release SHA and validation evidence are tracked under AIP-EVAL-01 in the AI Player design.
