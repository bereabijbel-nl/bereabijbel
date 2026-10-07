# Vuldata van derden (alleen demo)

Deze map valt **niet** onder de CC0/MIT-licenties van dit project.

## KJV.zip

- **Wat**: King James Version (1769) met Strong-nummers en morfologie per woord.
- **Bron**: [CrossWire SWORD Project, module KJV 3.1](https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=KJV), onveranderd.
- **Licentie**: CrossWire Bible Society (2003-2023): "hereby grants a general public license to use this text for any purpose". Distributielicentie: GPL.
- **Gebruik**: alleen in de demo-build, om bij een vindplaats het Engelse woord te markeren. `pipeline/scripts/verwerk-kjv-strong.js` zet het om naar `data/kjv_strong/` (niet in git) en doet niets bij `PUBLIC_INDEXABLE=true`. In productie wordt het niet getoond en niet meegebouwd.
