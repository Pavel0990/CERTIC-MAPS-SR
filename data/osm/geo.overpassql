[out:json][timeout:120];
area(3603412368)->.sr;
(
  nwr["waterway"="dam"](area.sr);
  nwr["natural"="water"]["name"](area.sr);
  nwr["water"="reservoir"](area.sr);
  way["highway"~"^(path|footway|track)$"]["name"](area.sr);
  way["waterway"="river"]["name"](area.sr);
  node["place"~"^(village|hamlet|town)$"](area.sr);
);
out center tags;
