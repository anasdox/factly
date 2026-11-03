# Demo — Reformulate an AI suggestion

## Try it
1. Open a discovery with inputs, select one, click **Generate facts**.
2. On a suggested fact, click **Reformulate**: the card opens for editing and
   2–3 alternative wordings appear, each with its justification.
3. Click one: it replaces the text, which stays editable. Click **Reformulate**
   again for new alternatives, or **Confirm** to add the fact.
4. Same on suggested insights (from selected facts) and suggested
   recommendations (from selected insights).

## Implemented
- Reformulate on suggested facts, insights and recommendations
- Context sent: discovery goal + source excerpt (facts), related facts
  (insights) or related insights (recommendations)
- On failure, a message under the text; the text is kept

## Not implemented (non-goals)
- Suggested outputs and internet research results
- Reformulating all suggestions at once

## Limitations
- Alternatives are in the language the model chooses: `/reformulate` does not
  take the discovery language yet.
