# Conquest commission strategies

All countries can pursue alternate-history world conquest. Eligible settlements
must still be accessible to the player and have a sailing route from the issuer.
Diplomatic authorization remains necessary for sovereign targets; independent
settlements do not require a fictional war against a single neutral country.
Pirate havens retain their separate suppression system. Unestablished or abandoned
colonies are not conquest footholds.

There is no distance, empire-size, or enemy-port-count veto. A strong enemy's
capital receives a lower score than its last remaining capital, but remains
eligible. Conquering it still uses the existing peace treaty rules: this does not
make annexation of a large empire automatic.

## Scoring

The offer's travel distance and reward still describe the voyage from its issuer.
Target priorities instead combine:

- Distance from the nearest currently owned port, so conquests create footholds.
- Distance from the current in-game capital/naval capital, when reachable.
- Population, colonies, and the strength of a capital's remaining possessions.
- Historical ambitions and recovery of founding possessions.
- A country's strategic interests at canonically identified ports.
- Bounded, seeded variation with canonical IDs resolving ties.

Distance preferences have positive floors. Historical priority categories are
bonuses rather than exclusive tiers. Thus an important maritime site can outweigh
a closer land target, without barring all other targets. Owning a port immediately
removes it from consideration; newly owned ports affect subsequent frontier
scores. Existing accepted commissions and pending offers retain their identity.
No new save fields or migration are needed.

## Historical basis and limits

These weights are game design interpretations of policies, not measured historical
utility functions or fixed national personalities. The game starts in 1522; its
existing dated Mughal ambitions remain dated. The model does not award a later
colonial empire to England or the Netherlands by assumption. Countries without a
researched override use the general frontier preference, with no claim that this
reconstructs their historical policy.

| Country | Interpretation | Evidence |
| --- | --- | --- |
| Portugal | Weak distance penalties and strong interests in Goa, Hormuz, Malacca, Aden, Diu, Muscat and spice-route posts. Morocco remains eligible, including recovery of lost Portuguese possessions. | The [Portuguese Navy museum](https://cultura.marinha.pt/pt/museumarinha_web/multimedia_web/Paginas/efemeride-primeira-investida-ormuz.aspx) describes Albuquerque's plan to control key maritime entrepôts; the [Met timeline](https://www.metmuseum.org/exhibitions/listings/2013/interwoven-globe) documents the Asian port network. |
| Ottoman Empire | Mix territorial consolidation with control of trade-route strongpoints; preserve existing named ambitions. | [University of Malta research](https://www.um.edu.mt/library/oar/handle/123456789/25166) describes territorial conquest alongside maritime commercial objectives. [Harvard's Indian Ocean study](https://cmes.fas.harvard.edu/publications/ottoman-age-exploration-spices-maps-and-conquest-sixteenth-century-indian-ocean) documents Ottoman competition over maritime communications and spice trade. |
| Venice | Combine regional consolidation with recovery of the Corfu, Crete and Cyprus network. | [Treccani's Venice history](https://www.treccani.it/enciclopedia/venezia/) treats both its mainland and overseas possessions. The canonical sites are Kerkira, Iraklion and Nicosia, not modern display-name matches. |
| Mughals | Strong frontier/population preference with existing dated Indian ambitions. | The [Met's Mughal history](https://www.metmuseum.org/es/essays/the-art-of-the-mughals-before-1600) describes Babur's Indian conquests and the subsequent consolidation. |
| Muscovy | Strong frontier/population preference; no invented list of overseas colonies. | [Encyclopaedia Iranica](https://www.iranicaonline.org/articles/russia-i-relations/) links expansion through Kazan and Astrakhan with the Volga-Caspian trade corridor. This is an interpretation within a port-based game, not a land-campaign simulation. |
| Tidore and Ternate | Moderate frontier preference, less emphasis on large populations, and particular interest in the rival spice-trading center. | [Research on early modern Tidore](https://ejournal.um.edu.my/index.php/JAT/article/view/56623) describes the sultanates' rivalry and political/trade networks. This does not label every island they traded with as a historical conquest. |

Strategic interests are preferences conditional on existing diplomatic eligibility;
a commercial relationship alone is not treated as a declaration of war. The exact
weights are intentionally tunable. Regression tests cover Portugal choosing distant
Malacca over an equally populous nearby Moroccan target, every faction retaining
positive remote priorities, shifting frontiers, intact enemy capitals, canonical
identity, and the actual Tidore-to-Lisbon sailing route.
