[out:json][timeout:120];
area(3603412368)->.sr;
(
  nwr["shop"](area.sr);
  nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pharmacy|clinic|doctors|hospital|fuel|bank|marketplace|ice_cream)$"](area.sr);
  nwr["tourism"](area.sr);
  nwr["historic"](area.sr);
  nwr["natural"~"^(waterfall|peak|spring|cave_entrance)$"]["name"](area.sr);
  nwr["leisure"~"^(park|nature_reserve|swimming_area)$"]["name"](area.sr);
  nwr["amenity"~"^(place_of_worship|arts_centre|theatre)$"]["name"](area.sr);
  nwr["boundary"="protected_area"]["name"](area.sr);
  nwr["waterway"="waterfall"](area.sr);
  relation["route"~"^(hiking|foot|bicycle|mtb)$"](area.sr);
);
out center tags;
