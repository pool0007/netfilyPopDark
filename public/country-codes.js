// Mapeo completo de países a códigos para banderas
const COUNTRY_CODES = {
  // América
  'United States': 'us', 'United States of America': 'us', 'USA': 'us',
  'Canada': 'ca', 'Mexico': 'mx', 'Brazil': 'br', 'Argentina': 'ar',
  'Colombia': 'co', 'Peru': 'pe', 'Chile': 'cl', 'Ecuador': 'ec',
  'Venezuela': 've', 'Guatemala': 'gt', 'Cuba': 'cu', 'Bolivia': 'bo',
  'Dominican Republic': 'do', 'Honduras': 'hn', 'Paraguay': 'py',
  'El Salvador': 'sv', 'Nicaragua': 'ni', 'Costa Rica': 'cr',
  'Panama': 'pa', 'Uruguay': 'uy', 'Jamaica': 'jm', 'Trinidad and Tobago': 'tt',
  'Guyana': 'gy', 'Suriname': 'sr', 'Belize': 'bz', 'Bahamas': 'bs',
  'Barbados': 'bb', 'Saint Lucia': 'lc', 'Grenada': 'gd', 'Saint Vincent and the Grenadines': 'vc',
  'Antigua and Barbuda': 'ag', 'Dominica': 'dm', 'Saint Kitts and Nevis': 'kn',

  // Europa
  'United Kingdom': 'gb', 'Great Britain': 'gb', 'UK': 'gb',
  'Germany': 'de', 'France': 'fr', 'Italy': 'it', 'Spain': 'es',
  'Portugal': 'pt', 'Netherlands': 'nl', 'Belgium': 'be', 'Switzerland': 'ch',
  'Austria': 'at', 'Sweden': 'se', 'Norway': 'no', 'Denmark': 'dk',
  'Finland': 'fi', 'Ireland': 'ie', 'Poland': 'pl', 'Czech Republic': 'cz',
  'Hungary': 'hu', 'Romania': 'ro', 'Greece': 'gr', 'Bulgaria': 'bg',
  'Serbia': 'rs', 'Croatia': 'hr', 'Slovakia': 'sk', 'Slovenia': 'si',
  'Lithuania': 'lt', 'Latvia': 'lv', 'Estonia': 'ee', 'Luxembourg': 'lu',
  'Malta': 'mt', 'Cyprus': 'cy', 'Iceland': 'is', 'Albania': 'al',
  'Macedonia': 'mk', 'Montenegro': 'me', 'Bosnia and Herzegovina': 'ba',
  'Moldova': 'md', 'Ukraine': 'ua', 'Belarus': 'by', 'Russia': 'ru',
  'Russian Federation': 'ru',

  // Asia
  'China': 'cn', 'Japan': 'jp', 'India': 'in', 'South Korea': 'kr',
  'Korea, Republic of': 'kr', 'Indonesia': 'id', 'Vietnam': 'vn',
  'Thailand': 'th', 'Malaysia': 'my', 'Philippines': 'ph', 'Singapore': 'sg',
  'Israel': 'il', 'Saudi Arabia': 'sa', 'United Arab Emirates': 'ae',
  'Qatar': 'qa', 'Kuwait': 'kw', 'Oman': 'om', 'Bahrain': 'bh',
  'Jordan': 'jo', 'Lebanon': 'lb', 'Turkey': 'tr', 'Iran': 'ir',
  'Iraq': 'iq', 'Pakistan': 'pk', 'Bangladesh': 'bd', 'Sri Lanka': 'lk',
  'Nepal': 'np', 'Myanmar': 'mm', 'Cambodia': 'kh', 'Laos': 'la',
  'Mongolia': 'mn', 'Kazakhstan': 'kz', 'Uzbekistan': 'uz', 'Azerbaijan': 'az',
  'Armenia': 'am', 'Georgia': 'ge', 'Kyrgyzstan': 'kg', 'Tajikistan': 'tj',
  'Turkmenistan': 'tm', 'Afghanistan': 'af', 'Yemen': 'ye', 'Syria': 'sy',

  // África
  'Egypt': 'eg', 'South Africa': 'za', 'Nigeria': 'ng', 'Ethiopia': 'et',
  'Kenya': 'ke', 'Ghana': 'gh', 'Morocco': 'ma', 'Algeria': 'dz',
  'Tunisia': 'tn', 'Uganda': 'ug', 'Sudan': 'sd', 'Angola': 'ao',
  'Mozambique': 'mz', 'Madagascar': 'mg', 'Cameroon': 'cm', "Côte d'Ivoire": 'ci',
  'Ivory Coast': 'ci', 'Tanzania': 'tz', 'Zambia': 'zm', 'Zimbabwe': 'zw',
  'Senegal': 'sn', 'Mali': 'ml', 'Burkina Faso': 'bf', 'Niger': 'ne',
  'Chad': 'td', 'Somalia': 'so', 'Rwanda': 'rw', 'Burundi': 'bi',
  'Benin': 'bj', 'Togo': 'tg', 'Libya': 'ly', 'Congo': 'cg',
  'Democratic Republic of the Congo': 'cd', 'Gabon': 'ga', 'Botswana': 'bw',
  'Namibia': 'na', 'Mauritius': 'mu', 'Eritrea': 'er', 'Sierra Leone': 'sl',

  // Oceanía
  'Australia': 'au', 'New Zealand': 'nz', 'Fiji': 'fj', 'Papua New Guinea': 'pg',
  'Solomon Islands': 'sb', 'Vanuatu': 'vu', 'Samoa': 'ws', 'Kiribati': 'ki',
  'Tonga': 'to', 'Micronesia': 'fm', 'Palau': 'pw', 'Marshall Islands': 'mh',

  // Países en español y variaciones comunes
  'España': 'es', 'México': 'mx', 'Argentina': 'ar', 'Chile': 'cl',
  'Colombia': 'co', 'Perú': 'pe', 'Venezuela': 've', 'Ecuador': 'ec',
  'Guatemala': 'gt', 'Cuba': 'cu', 'Bolivia': 'bo', 'República Dominicana': 'do',
  'Honduras': 'hn', 'Paraguay': 'py', 'El Salvador': 'sv', 'Nicaragua': 'ni',
  'Costa Rica': 'cr', 'Panamá': 'pa', 'Uruguay': 'uy', 'Puerto Rico': 'pr'
};

// Función para obtener código de país
function getCountryCode(countryName, providedCode = null) {
  if (providedCode) return providedCode.toLowerCase();
  return COUNTRY_CODES[countryName] || 'un';
}
