// Mapeo completo de países a códigos para banderas
const COUNTRY_CODES = {
  // América
  'United States': 'us', 'United States of America': 'us', 'USA': 'us',
  'Canada': 'ca', 'Mexico': 'mx', 'Brazil': 'br', 'Argentina': 'ar',
  'Colombia': 'co', 'Peru': 'pe', 'Chile': 'cl', 'Ecuador': 'ec',
  'Venezuela': 've', 'Guatemala': 'gt', 'Cuba': 'cu', 'Bolivia': 'bo',
  'Dominican Republic': 'do', 'Honduras': 'hn', 'Paraguay': 'py',
  'El Salvador': 'sv', 'Nicaragua': 'ni', 'Costa Rica': 'cr',
  'Panama': 'pa', 'Uruguay': 'uy', 'Jamaica': 'jm',
  'Global': 'un', 'Unknown': 'un',

  // Europa
  'United Kingdom': 'gb', 'Great Britain': 'gb', 'UK': 'gb',
  'Germany': 'de', 'France': 'fr', 'Italy': 'it', 'Spain': 'es',
  'Portugal': 'pt', 'Netherlands': 'nl', 'Belgium': 'be', 'Switzerland': 'ch',
  'Austria': 'at', 'Sweden': 'se', 'Norway': 'no', 'Denmark': 'dk',
  'Finland': 'fi', 'Ireland': 'ie', 'Poland': 'pl', 'Czech Republic': 'cz',
  'Hungary': 'hu', 'Romania': 'ro', 'Greece': 'gr', 'Ukraine': 'ua',
  'Russia': 'ru', 'Russian Federation': 'ru',

  // Asia
  'China': 'cn', 'Japan': 'jp', 'India': 'in', 'South Korea': 'kr',
  'Korea, Republic of': 'kr', 'Indonesia': 'id', 'Vietnam': 'vn',
  'Thailand': 'th', 'Malaysia': 'my', 'Philippines': 'ph', 'Singapore': 'sg',
  'Israel': 'il', 'Saudi Arabia': 'sa', 'United Arab Emirates': 'ae',
  'Qatar': 'qa', 'Kuwait': 'kw', 'Turkey': 'tr', 'Iran': 'ir',
  'Iraq': 'iq', 'Pakistan': 'pk', 'Bangladesh': 'bd',

  // África
  'Egypt': 'eg', 'South Africa': 'za', 'Nigeria': 'ng', 'Ethiopia': 'et',
  'Kenya': 'ke', 'Ghana': 'gh', 'Morocco': 'ma', 'Algeria': 'dz',

  // Oceanía
  'Australia': 'au', 'New Zealand': 'nz',

  // Países en español
  'España': 'es', 'México': 'mx', 'Argentina': 'ar', 'Chile': 'cl',
  'Colombia': 'co', 'Perú': 'pe', 'Venezuela': 've', 'Ecuador': 'ec',
  'Guatemala': 'gt', 'Cuba': 'cu', 'Bolivia': 'bo', 'República Dominicana': 'do',
  'Honduras': 'hn', 'Paraguay': 'py', 'El Salvador': 'sv', 'Nicaragua': 'ni',
  'Costa Rica': 'cr', 'Panamá': 'pa', 'Uruguay': 'uy'
};

// Función para obtener código de país
function getCountryCode(countryName, providedCode = null) {
  if (providedCode) return providedCode.toLowerCase();
  
  if (!countryName) return 'un';
  
  const normalizedCountry = countryName.trim();
  
  // Buscar coincidencia exacta
  if (COUNTRY_CODES[normalizedCountry]) {
    return COUNTRY_CODES[normalizedCountry];
  }
  
  // Buscar coincidencia case-insensitive
  for (const [key, value] of Object.entries(COUNTRY_CODES)) {
    if (key.toLowerCase() === normalizedCountry.toLowerCase()) {
      return value;
    }
  }
  
  return 'un';
}
