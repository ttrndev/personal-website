/**
 * Everything the page says and links to lives here, so editing the site never
 * means touching a component.
 */
export const site = {
  title: 'Welcome to kitsune.here',
  lead: ['My name is timtaran and I am software developer', 'You can find more on'],

  /** The clown logo next to the lead text links here. */
  home: 'https://timtaran.clwn.org',

  socialsLabel: 'Socials:',
  // TODO: confirm these two URLs — they are guesses based on the handle.
  socials: [
    { label: 'GitHub', href: 'https://github.com/timtaran' },
    { label: 'YouTube', href: 'https://www.youtube.com/@timtaran' },
  ],

  /** Spelled out on purpose so scrapers don't pick the address up. */
  contact: 'Contact: timtaran<at>clwn<dot>org',

  artwork: {
    prefix: 'Artwork by',
    name: 'curxvoid',
    // TODO: confirm where the artist's profile lives — this URL is a guess.
    href: 'https://x.com/curxvoid',
  },
} as const
