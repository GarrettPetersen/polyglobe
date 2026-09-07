# Historical character-name review

Names must fit the population at the campaign start in 1522. A name appearing in
a later biography is not sufficient evidence: distinguish an indigenous name
from a colonial baptismal name, outsider nickname, title, or population name.
European names are not universally inappropriate outside Europe: for example,
Kongo's conversion began before the campaign start.

## Khoikhoi correction

The old pool included Klaas, Doman, Schacher and Sara from the Dutch colonial
context. They must not be generated for the pre-settlement Khoikhoi population.
Goreinghaicona is a population name and has also been removed from given names.
Gogosoa is recorded as a local leader's name in the early Cape accounts.

Sources:

- [Early Cape accounts, edited by I. Schapera](https://www.dbnl.org/tekst/dapp001earl01_01/dapp001earl01_01.pdf): Gogosoa and the distinction between the local groups and their leaders (printed p. 9).
- [George Mason University primary-source teaching collection](https://chnm.gmu.edu/wwh/p/69.html): Krotoa versus her Dutch name Eva; colonial naming and the seventeenth-century context.
- [Royal College of Physicians collections research](https://history.rcp.ac.uk/sites/default/files/2022-05/RCP%20collections%20links%20to%20the%20transatlantic%20slave%20trade%20FINAL.pdf): Sara/Saartjie Baartman's birth name is unknown; the recorded name must not be projected into a precolonial name list.

The surviving evidence used here is later than 1522. Indigenous forms are an
approximation, not a claim that these historical individuals lived in 1522.
This correction is **not a completed historical certification of all pools**.
Unsupported female entries Hoena, Kamies, Nama and Tsoa have also been removed.
Only Krotoa remains in the female pool: repetition is preferable to invented
attestation. Khoikhoi personal names can be shared; canonical entity IDs remain
distinct. Both ordinary and family-member generation follow that rule.
The existing group-name suffixes remain a gameplay affiliation convention, not
a claim that these were European-style hereditary surnames in 1522.

Existing generated names are repaired by the existing load-boundary name
reconciliation, including ordinary crew (which store only a full name), cached
recruits and component-based named characters. The repair is explicit,
idempotent, culture-specific and preserves IDs, origin, experience and other
history. Replacement names are fictional replacements, not translations of the
retired aliases. Saved arbitrary names are not matched by prefix. No persisted
field or schema shape changes.

The regression tests cover both current Khoikhoi pools and repeated family names and exercise saved
crew, offers, named characters, other cultures and custom-name boundaries.
Historical evidence still requires human review; tests prevent reintroduction
of identified bad entries, not the invention of new anachronisms.
