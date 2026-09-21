export type ExpertStoreOption = { name: string; city: string; slug: string; aliases?: string[] };

const cities = [
  "Almelo","Amsterdam","Apeldoorn","Assen","Asten","Baak","Barneveld","Beilen","Beuningen","Berkel & Rodenrijs","Boxtel","Bolsward","Boskoop","Breda","Breezand","Breukelen","Brielle","Burgum","Castricum","Cuijk","Culemborg","Deurne","Deventer","Delfzijl","Den Bosch","Den Burg","Diemen","Dinxperlo","Dirksland","Dokkum","Dongen","Drachten","Dronten","Drunen","Eelde","Elst","Emmeloord","Emmen","Enschede","Epe","Ermelo","Franeker","Gennep","Goor","Gorredijk","Gouda","Groningen","Haaksbergen","Hardenberg","Harderwijk","Hardinxveld-Giessendam","Haren","Harlingen","Haarlem Cronje","Heemskerk","Heerenveen","Helmond","Hengelo (gld)","Hengelo (ov)","Hoogeveen","Hoogezand","Horst","Houten","Huizen","IJmuiden","Joure","Kaatsheuvel","Klazienaveen","Krimpen a/d IJssel","Landgraaf","Laren","Leeuwarden","Leersum","Leiden","Lekkerkerk","Lemmer","Lochem","Maastricht","Marum","Meppel","Naaldwijk","Neede","Nederweert","Nijkerk","Nijverdal","Nunspeet","Nuenen","Oldenzaal","Ommen","Oosterwolde","Oss","Pijnacker","Purmerend","Raalte","Rheden","Roden","Roosendaal","s-Heerenberg","Sneek","Soest","St. Annaparochie","Stadskanaal","Steenwijk","Surhuisterveen","Ter Apel","Tiel","Tilburg","Twello","Tubbergen","Uden","Uithoorn","Uithuizen","Veenendaal","Veendam","Veldhoven","Velddriel","Venray","Vlaardingen","Vroomshoop","Wageningen","Wezep","Wieringerwerf","Wijchen","Winschoten","Woerden","Wolvega","Zevenaar","Zeewolde","Zeist","Zelhem","Zuidhorn","Zuidlaren","Zuid-Scharwoude","Zuidzande","Zwolle Stadshagen","Zwolle Zuid",
];

const slugify = (value: string) => value.toLocaleLowerCase("nl-NL").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const expertStores: ExpertStoreOption[] = cities.map((city) => ({ name: `Expert ${city}`, city, slug: slugify(city) }));

const drunen = expertStores.find((store) => store.city === "Drunen");
if (drunen) drunen.aliases = ["van de griendt", "griendt", "expert van de griendt"];
