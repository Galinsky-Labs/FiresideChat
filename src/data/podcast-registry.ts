export type RegistryPerson = {
  slug: string;
  fullName: string;
  kind: "HOUSE" | "SENATE" | "SHADOW_SENATE" | "PRESIDENT";
  state?: string;
  party?: string;
  isCurrent: boolean;
};

export type RegistryPodcast = {
  slug: string;
  title: string;
  rssUrl: string;
  websiteUrl?: string;
  active: boolean;
  publishingStatus: "ACTIVE" | "INACTIVE" | "UNKNOWN";
  verificationUrl: string;
  verifiedAt: string;
  verificationNote: string;
  people: Array<{
    personSlug: string;
    role: "HOST" | "COHOST" | "OFFICIAL_PRODUCER";
  }>;
};

export type RegistryCandidate = {
  person: string;
  show: string;
  sourceUrl: string;
  reason: string;
};

export const podcastRegistry: {
  people: RegistryPerson[];
  podcasts: RegistryPodcast[];
  candidates: RegistryCandidate[];
} = {
  people: [
    {
      slug: "alexandria-ocasio-cortez",
      fullName: "Alexandria Ocasio-Cortez",
      kind: "HOUSE",
      state: "NY",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "ed-markey",
      fullName: "Ed Markey",
      kind: "SENATE",
      state: "MA",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "marsha-blackburn",
      fullName: "Marsha Blackburn",
      kind: "SENATE",
      state: "TN",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "mark-pocan",
      fullName: "Mark Pocan",
      kind: "HOUSE",
      state: "WI",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "bernie-sanders",
      fullName: "Bernie Sanders",
      kind: "SENATE",
      state: "VT",
      party: "Independent",
      isCurrent: true,
    },
    {
      slug: "sheldon-whitehouse",
      fullName: "Sheldon Whitehouse",
      kind: "SENATE",
      state: "RI",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "james-lankford",
      fullName: "James Lankford",
      kind: "SENATE",
      state: "OK",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "jim-clyburn",
      fullName: "James E. Clyburn",
      kind: "HOUSE",
      state: "SC",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "scott-peters",
      fullName: "Scott Peters",
      kind: "HOUSE",
      state: "CA",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "marc-veasey",
      fullName: "Marc Veasey",
      kind: "HOUSE",
      state: "TX",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "greg-landsman",
      fullName: "Greg Landsman",
      kind: "HOUSE",
      state: "OH",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "mike-johnson",
      fullName: "Mike Johnson",
      kind: "HOUSE",
      state: "LA",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "anna-paulina-luna",
      fullName: "Anna Paulina Luna",
      kind: "HOUSE",
      state: "FL",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "erin-houchin",
      fullName: "Erin Houchin",
      kind: "HOUSE",
      state: "IN",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "eric-burlison",
      fullName: "Eric Burlison",
      kind: "HOUSE",
      state: "MO",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "ted-cruz",
      fullName: "Ted Cruz",
      kind: "SENATE",
      state: "TX",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "dan-crenshaw",
      fullName: "Dan Crenshaw",
      kind: "HOUSE",
      state: "TX",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "jared-huffman",
      fullName: "Jared Huffman",
      kind: "HOUSE",
      state: "CA",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "guy-reschenthaler",
      fullName: "Guy Reschenthaler",
      kind: "HOUSE",
      state: "PA",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "tim-burchett",
      fullName: "Tim Burchett",
      kind: "HOUSE",
      state: "TN",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "ruben-gallego",
      fullName: "Ruben Gallego",
      kind: "SENATE",
      state: "AZ",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "angus-king",
      fullName: "Angus King",
      kind: "SENATE",
      state: "ME",
      party: "Independent",
      isCurrent: true,
    },
    {
      slug: "tim-scott",
      fullName: "Tim Scott",
      kind: "SENATE",
      state: "SC",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "ron-johnson",
      fullName: "Ron Johnson",
      kind: "SENATE",
      state: "WI",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "pete-ricketts",
      fullName: "Pete Ricketts",
      kind: "SENATE",
      state: "NE",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "gil-cisneros",
      fullName: "Gil Cisneros",
      kind: "HOUSE",
      state: "CA",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "troy-carter",
      fullName: "Troy A. Carter",
      kind: "HOUSE",
      state: "LA",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "mark-alford",
      fullName: "Mark Alford",
      kind: "HOUSE",
      state: "MO",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "brian-fitzpatrick",
      fullName: "Brian Fitzpatrick",
      kind: "HOUSE",
      state: "PA",
      party: "Republican",
      isCurrent: true,
    },
    {
      slug: "tom-suozzi",
      fullName: "Tom Suozzi",
      kind: "HOUSE",
      state: "NY",
      party: "Democratic",
      isCurrent: true,
    },
    {
      slug: "al-franken",
      fullName: "Al Franken",
      kind: "SENATE",
      state: "MN",
      party: "Democratic",
      isCurrent: false,
    },
    {
      slug: "trey-gowdy",
      fullName: "Trey Gowdy",
      kind: "HOUSE",
      state: "SC",
      party: "Republican",
      isCurrent: false,
    },
    {
      slug: "jason-chaffetz",
      fullName: "Jason Chaffetz",
      kind: "HOUSE",
      state: "UT",
      party: "Republican",
      isCurrent: false,
    },
    {
      slug: "newt-gingrich",
      fullName: "Newt Gingrich",
      kind: "HOUSE",
      state: "GA",
      party: "Republican",
      isCurrent: false,
    },
    {
      slug: "doug-collins",
      fullName: "Doug Collins",
      kind: "HOUSE",
      state: "GA",
      party: "Republican",
      isCurrent: false,
    },
    {
      slug: "joe-walsh",
      fullName: "Joe Walsh",
      kind: "HOUSE",
      state: "IL",
      party: "Republican",
      isCurrent: false,
    },
    {
      slug: "george-lemieux",
      fullName: "George LeMieux",
      kind: "SENATE",
      state: "FL",
      party: "Republican",
      isCurrent: false,
    },
    {
      slug: "anthony-weiner",
      fullName: "Anthony Weiner",
      kind: "HOUSE",
      state: "NY",
      party: "Democratic",
      isCurrent: false,
    },
    {
      slug: "michael-d-brown",
      fullName: "Michael D. Brown",
      kind: "SHADOW_SENATE",
      state: "DC",
      party: "Democratic",
      isCurrent: false,
    },
    {
      "slug": "ron-paul",
      "fullName": "Ron Paul",
      "kind": "HOUSE",
      "state": "TX",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "matt-gaetz",
      "fullName": "Matt Gaetz",
      "kind": "HOUSE",
      "state": "FL",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "adam-kinzinger",
      "fullName": "Adam Kinzinger",
      "kind": "HOUSE",
      "state": "IL",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "heidi-heitkamp",
      "fullName": "Heidi Heitkamp",
      "kind": "SENATE",
      "state": "ND",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "jon-tester",
      "fullName": "Jon Tester",
      "kind": "SENATE",
      "state": "MT",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "hillary-clinton",
      "fullName": "Hillary Rodham Clinton",
      "kind": "SENATE",
      "state": "NY",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "bill-clinton",
      "fullName": "Bill Clinton",
      "kind": "PRESIDENT",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "tulsi-gabbard",
      "fullName": "Tulsi Gabbard",
      "kind": "HOUSE",
      "state": "HI",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "joe-scarborough",
      "fullName": "Joe Scarborough",
      "kind": "HOUSE",
      "state": "FL",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "sean-duffy",
      "fullName": "Sean Duffy",
      "kind": "HOUSE",
      "state": "WI",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "sherrod-brown",
      "fullName": "Sherrod Brown",
      "kind": "SENATE",
      "state": "OH",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "tim-hutchinson",
      "fullName": "Tim Hutchinson",
      "kind": "SENATE",
      "state": "AR",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "steve-pearce",
      "fullName": "Steve Pearce",
      "kind": "HOUSE",
      "state": "NM",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "jon-porter",
      "fullName": "Jon Porter",
      "kind": "HOUSE",
      "state": "NV",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "denver-riggleman",
      "fullName": "Denver Riggleman",
      "kind": "HOUSE",
      "state": "VA",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "patrick-j-murphy",
      "fullName": "Patrick J. Murphy",
      "kind": "HOUSE",
      "state": "PA",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "marjorie-taylor-greene",
      "fullName": "Marjorie Taylor Greene",
      "kind": "HOUSE",
      "state": "GA",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "george-santos",
      "fullName": "George Santos",
      "kind": "HOUSE",
      "state": "NY",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "cori-bush",
      "fullName": "Cori Bush",
      "kind": "HOUSE",
      "state": "MO",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "jamaal-bowman",
      "fullName": "Jamaal Bowman",
      "kind": "HOUSE",
      "state": "NY",
      "party": "Democratic",
      "isCurrent": false
    },
    {
      "slug": "john-kasich",
      "fullName": "John Kasich",
      "kind": "HOUSE",
      "state": "OH",
      "party": "Republican",
      "isCurrent": false
    },
    {
      "slug": "peter-roskam",
      "fullName": "Peter Roskam",
      "kind": "HOUSE",
      "state": "IL",
      "party": "Republican",
      "isCurrent": false
    },
  ],
  podcasts: [
    {
      slug: "the-ed-markey-podcast",
      title: "The Ed Markey Podcast",
      rssUrl: "https://media.rss.com/edmarkeypodcast/feed.xml",
      websiteUrl: "https://rss.com/podcasts/edmarkeypodcast",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/the-ed-markey-podcast/id1729232913",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Apple identifies Senator Ed Markey as creator and links the show website to rss.com/podcasts/edmarkeypodcast; RSS.com's documented canonical feed format yields this feed URL.",
      people: [{ personSlug: "ed-markey", role: "HOST" }],
    },
    {
      slug: "unmuted-with-senator-marsha-blackburn",
      title: "Unmuted with Senator Marsha Blackburn",
      rssUrl: "https://feeds.buzzsprout.com/2328442.rss",
      websiteUrl: "https://www.buzzsprout.com/2328442",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://www.buzzsprout.com/2328442",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Buzzsprout identifies Senator Marsha Blackburn as host and exposes the canonical RSS feed directly from the publisher page.",
      people: [{ personSlug: "marsha-blackburn", role: "HOST" }],
    },
    {
      slug: "with-liberty-and-justice-for-some",
      title: "With Liberty and Justice for Some",
      rssUrl: "https://anchor.fm/s/ff00a8d4/podcast/rss",
      websiteUrl: "https://pocan.house.gov/",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://podcastrepublic.net/podcast/1794881118",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Podcast directories identify Rep. Mark Pocan as host and expose the canonical Anchor RSS feed.",
      people: [{ personSlug: "mark-pocan", role: "HOST" }],
    },
    {
      slug: "hear-the-bern",
      title: "Hear the Bern",
      rssUrl: "https://feeds.blubrry.com/feeds/hear_the_bern.xml",
      websiteUrl: "https://berniesanders.com/podcast/",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl: "https://podcastrepublic.net/podcast/1458648316",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Podcast directories identify Bernie Sanders and Briahna Joy Gray as hosts; the historical campaign feed remains available.",
      people: [{ personSlug: "bernie-sanders", role: "COHOST" }],
    },
    {
      slug: "making-the-case",
      title: "Making the Case",
      rssUrl: "https://anchor.fm/s/e0d8cda0/podcast/rss",
      websiteUrl: "https://www.whitehouse.senate.gov/making-the-case/",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl:
        "https://www.whitehouse.senate.gov/news/release/whitehouse-launches-making-the-case-podcast-to-shine-light-on-far-right-scheme-to-capture-supreme-court/",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Senator Whitehouse's official Senate office launched the show and podcast directories expose the canonical Anchor RSS feed.",
      people: [{ personSlug: "sheldon-whitehouse", role: "HOST" }],
    },
    {
      slug: "the-breakdown-with-james-lankford",
      title: "The Breakdown with James Lankford",
      rssUrl: "https://feeds.feedburner.com/TheBreakdownwithJamesLankford",
      websiteUrl: "https://www.lankford.senate.gov/",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://www.lankford.senate.gov/news/press-releases/senator-lankford-releases-podcast-on-solution-to-end-government-shutdowns/",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Official Senate releases identify The Breakdown as Senator Lankford's podcast; the canonical feed is preserved for the historical archive.",
      people: [{ personSlug: "james-lankford", role: "HOST" }],
    },
    {
      slug: "clyburn-chronicles",
      title: "Clyburn Chronicles",
      rssUrl: "https://feed.podbean.com/clyburnchronicles/feed.xml",
      websiteUrl: "https://clyburnchronicles.podbean.com/",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl: "https://clyburnchronicles.podbean.com/",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Publisher page identifies Congressman James Clyburn as host; the feed follows Podbean's canonical feed endpoint for the publisher subdomain.",
      people: [{ personSlug: "jim-clyburn", role: "HOST" }],
    },
    {
      slug: "72-and-sunny-with-scott-peters",
      title: "72 and Sunny with Scott Peters",
      rssUrl:
        "https://www.omnycontent.com/d/playlist/d57f2f8a-7bab-4064-9571-ae7c0139f8ec/2e7a4896-2eb4-4fdb-97b4-b3df00fdbdd1/da3fe69b-dedc-4726-99f0-b3df00fdc27a/podcast.rss",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl:
        "https://www.olaspodcast.com/72-and-sunny-with-scott-peters",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Publisher page identifies Congressman Scott Peters as host and exposes the canonical Omny RSS feed.",
      people: [{ personSlug: "scott-peters", role: "HOST" }],
    },
    {
      slug: "the-fly-in",
      title: "The Fly-In",
      rssUrl: "https://api.substack.com/feed/podcast/5246009.rss",
      websiteUrl: "https://newdemocratcoalition.substack.com/",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl:
        "https://newdemocratcoalition.house.gov/media-center/press-releases/new-democrat-coalition-launches-the-fly-in-podcast",
      verifiedAt: "2026-10-05",
      verificationNote:
        "New Democrat Coalition and podcast metadata identify Reps. Greg Landsman and Marc Veasey as co-hosts.",
      people: [
        { personSlug: "greg-landsman", role: "COHOST" },
        { personSlug: "marc-veasey", role: "COHOST" },
      ],
    },
    {
      slug: "truth-be-told-with-mike-and-kelly-johnson",
      title: "Truth be Told with Mike & Kelly Johnson",
      rssUrl: "https://feeds.libsyn.com/404672/rss",
      websiteUrl: "https://www.mikeandkellyjohnson.com/",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/truth-be-told-with-mike-kelly-johnson/id1613637836",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Podcast metadata identifies Congressman Mike Johnson and Kelly Johnson as co-hosts; the archived Libsyn feed remains available.",
      people: [{ personSlug: "mike-johnson", role: "COHOST" }],
    },
    {
      slug: "luna-talks-with-anna-paulina",
      title: "Luna Talks with Anna Paulina",
      rssUrl:
        "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/35c394c3-f8c7-45f5-be55-ae27016d8c23/69d87d5f-23a7-4c22-a11c-ae27016d8c36/podcast.rss",
      websiteUrl: "https://omny.fm/shows/luna-talks-with-anna-paulina",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://www.podbean.com/podcast-detail/22iqr-1b2b0d/Luna-Talks-with-Anna-Paulina-Podcast",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Podcast directories identify Anna Paulina Luna as host and expose the canonical Omny RSS feed for the historical series.",
      people: [{ personSlug: "anna-paulina-luna", role: "HOST" }],
    },
    {
      slug: "the-contender-with-erin-houchin",
      title: "The Contender with Erin Houchin",
      rssUrl: "https://feed.podbean.com/thecontendereh/feed.xml",
      websiteUrl: "https://thecontendereh.podbean.com/",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://thecontendereh.podbean.com/",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Publisher page identifies Congresswoman Erin Houchin as host; the feed uses Podbean's canonical endpoint for the publisher subdomain.",
      people: [{ personSlug: "erin-houchin", role: "HOST" }],
    },
    {
      slug: "fresh-freedom",
      title: "Fresh Freedom",
      rssUrl: "https://anchor.fm/s/db2f52d4/podcast/rss",
      websiteUrl: "https://burlison.house.gov/",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/fresh-freedom/id1674604542",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Podcast metadata identifies Congressman Eric Burlison as host and Podstatus exposes the canonical Anchor RSS feed.",
      people: [{ personSlug: "eric-burlison", role: "HOST" }],
    },
    {
      slug: "verdict-with-ted-cruz",
      title: "Verdict with Ted Cruz",
      rssUrl:
        "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/2bee9419-43de-46ce-8996-af2a01167517/84cf551f-a33b-41d8-b112-af2a01167541/podcast.rss",
      websiteUrl: "https://omny.fm/shows/verdict-with-ted-cruz-1",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://omny.fm/shows/verdict-with-ted-cruz-1",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Publisher page identifies Senator Ted Cruz as the show's host alongside Ben Ferguson.",
      people: [{ personSlug: "ted-cruz", role: "HOST" }],
    },
    {
      slug: "hold-these-truths-with-dan-crenshaw",
      title: "Hold These Truths with Dan Crenshaw",
      rssUrl: "https://holdthesetruthswithdancrenshaw.libsyn.com/rss",
      websiteUrl: "https://holdthesetruthswithdancrenshaw.libsyn.com/",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://holdthesetruthswithdancrenshaw.libsyn.com/",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Publisher page identifies Congressman Dan Crenshaw as the show's host.",
      people: [{ personSlug: "dan-crenshaw", role: "HOST" }],
    },
    {
      slug: "off-the-cuff-with-jared-huffman",
      title: "Off the Cuff with Jared Huffman",
      rssUrl:
        "https://feeds.soundcloud.com/users/soundcloud%3Ausers%3A268948247/sounds.rss",
      active: true,
      publishingStatus: "UNKNOWN",
      verificationUrl:
        "https://feeds.soundcloud.com/users/soundcloud%3Ausers%3A268948247/sounds.rss",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Feed metadata identifies the show as brought to listeners by Congressman Jared Huffman.",
      people: [{ personSlug: "jared-huffman", role: "HOST" }],
    },
    {
      slug: "get-going-with-guy-reschenthaler",
      title: "Get Going with Guy Reschenthaler",
      rssUrl: "https://anchor.fm/s/57106164/podcast/rss",
      websiteUrl: "https://podcasters.spotify.com/pod/show/guyreschenthaler",
      active: true,
      publishingStatus: "UNKNOWN",
      verificationUrl: "https://podcasters.spotify.com/pod/show/guyreschenthaler",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Show metadata identifies Congressman Guy Reschenthaler as the speaker and host.",
      people: [{ personSlug: "guy-reschenthaler", role: "HOST" }],
    },
    {
      slug: "tennessee-talks-with-tim-burchett",
      title: "Tennessee Talks with Tim Burchett",
      rssUrl: "https://media.rss.com/tennesseetalks/feed.xml",
      websiteUrl: "https://rss.com/podcasts/tennesseetalks",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/tennessee-talks-with-tim-burchett/id1604614351",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple identifies Congressman Tim Burchett as creator and links the show website to rss.com/podcasts/tennesseetalks; the canonical RSS.com feed endpoint was independently live-verified on 2026-10-07.",
      people: [{ personSlug: "tim-burchett", role: "HOST" }],
    },
    {
      slug: "unscripted-with-tim-burchett",
      title: "Unscripted with Tim Burchett",
      rssUrl: "https://anchor.fm/s/106cc7b4c/podcast/rss",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/unscripted-with-tim-burchett/id1823959003",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple metadata identifies Tim Burchett as the artist and exposes the canonical Anchor RSS feed; the endpoint was live-verified on 2026-10-07.",
      people: [{ personSlug: "tim-burchett", role: "HOST" }],
    },
    {
      slug: "real-talk-with-ruben",
      title: "Real Talk with Ruben",
      rssUrl: "https://api.riverside.fm/hosting/r1lIhYeW.rss",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/real-talk-with-ruben/id1888294647",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple metadata identifies Senator Ruben Gallego as the artist and exposes the canonical Riverside RSS feed; the endpoint was live-verified on 2026-10-07.",
      people: [{ personSlug: "ruben-gallego", role: "HOST" }],
    },
    {
      slug: "inside-maine-with-senator-angus-king",
      title: "Inside Maine with Senator Angus King",
      rssUrl: "https://www.king.senate.gov/podcast/feed?new",
      websiteUrl: "https://www.king.senate.gov/podcast/",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/inside-maine-with-senator-angus-king/id1089371119",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple metadata identifies U.S. Senator Angus King as the artist and exposes the official Senate-hosted RSS feed; the endpoint was live-verified on 2026-10-07.",
      people: [{ personSlug: "angus-king", role: "HOST" }],
    },
    {
      slug: "opportunity-with-tim-scott",
      title: "Opportunity With Tim Scott",
      rssUrl: "https://feeds.simplecast.com/csy2Vjm1",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/opportunity-with-tim-scott/id1519108611",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple metadata identifies Senator Tim Scott as the artist and exposes the canonical Simplecast feed; the endpoint was live-verified on 2026-10-07.",
      people: [{ personSlug: "tim-scott", role: "HOST" }],
    },
    {
      slug: "hey-wisconsin",
      title: "Hey, Wisconsin",
      rssUrl:
        "https://feeds.soundcloud.com/users/soundcloud:users:225913226/sounds.rss",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/hey-wisconsin/id1114542739",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple metadata identifies the Senator Ron Johnson show and exposes its canonical SoundCloud RSS feed; the endpoint was live-verified on 2026-10-07.",
      people: [{ personSlug: "ron-johnson", role: "HOST" }],
    },
    {
      slug: "the-nebraska-way",
      title: "The Nebraska Way",
      rssUrl:
        "https://feeds.soundcloud.com/users/soundcloud:users:657762987/sounds.rss",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/the-nebraska-way/id1471046353",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple metadata exposes the historical Nebraska Way SoundCloud RSS feed; the endpoint was live-verified on 2026-10-07 and the show was hosted by Pete Ricketts.",
      people: [{ personSlug: "pete-ricketts", role: "HOST" }],
    },
    {
      slug: "who-dem",
      title: "Who Dem?",
      rssUrl: "https://anchor.fm/s/101b1e1d8/podcast/rss",
      active: true,
      publishingStatus: "UNKNOWN",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/who-dem/id1803142795",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple metadata exposes the canonical Anchor feed; it was live-verified on 2026-10-07 and Congressman Gil Cisneros' launch materials verify the host relationship.",
      people: [{ personSlug: "gil-cisneros", role: "COHOST" }],
    },
    {
      slug: "what-makes-america-tick",
      title: "\"What Makes America Tick?\" with Congressman Troy A. Carter, Sr.",
      rssUrl: "https://anchor.fm/s/103c70cdc/podcast/rss",
      websiteUrl: "https://troycarter.house.gov/about",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl:
        "https://podcasts.apple.com/us/podcast/what-makes-america-tick-with-congressman-troy-a-carter-sr/id1809799553",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Apple metadata identifies Congressman Troy A. Carter, Sr. as artist and exposes the canonical Anchor feed; the endpoint was live-verified on 2026-10-07 and his official House biography identifies him as founder and host.",
      people: [{ personSlug: "troy-carter", role: "HOST" }],
    },
    {
      slug: "the-pod-couple",
      title: "The Pod Couple",
      rssUrl: "https://media.rss.com/the-pod-couple-episode-1/feed.xml",
      websiteUrl:
        "https://problemsolverscaucus.house.gov/news/documentsingle.aspx?DocumentID=889",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl:
        "https://problemsolverscaucus.house.gov/news/documentsingle.aspx?DocumentID=889",
      verifiedAt: "2026-10-07",
      verificationNote:
        "The Problem Solvers Caucus officially identifies co-chairs Brian Fitzpatrick and Tom Suozzi as co-hosts; Apple metadata exposes the canonical RSS.com feed, live-verified on 2026-10-07.",
      people: [
        { personSlug: "brian-fitzpatrick", role: "COHOST" },
        { personSlug: "tom-suozzi", role: "COHOST" },
      ],
    },
    {
      slug: "mark-alfords-capitol-recap",
      title: "Mark Alford's Capitol Recap",
      rssUrl: "https://rss.buzzsprout.com/2311905.rss",
      websiteUrl: "https://alford.house.gov/capital-recap/",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://alford.house.gov/capital-recap/",
      verifiedAt: "2026-10-07",
      verificationNote:
        "Congressman Alford's official House site identifies Capitol Recap as his podcast; Apple metadata exposes the canonical Buzzsprout feed, live-verified on 2026-10-07.",
      people: [{ personSlug: "mark-alford", role: "HOST" }],
    },
    {
      slug: "the-al-franken-podcast",
      title: "The Al Franken Podcast",
      rssUrl: "https://audioboom.com/channels/5155312.rss",
      websiteUrl: "https://www.alfranken.com/the-al-franken-podcast",
      active: true,
      publishingStatus: "INACTIVE",
      verificationUrl: "https://www.alfranken.com/the-al-franken-podcast",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Al Franken's official site identifies the show as his podcast; the feed is retained as a historical archive.",
      people: [{ personSlug: "al-franken", role: "HOST" }],
    },
    {
      slug: "the-trey-gowdy-podcast",
      title: "The Trey Gowdy Podcast",
      rssUrl: "https://feeds.megaphone.fm/FOXM9459947004",
      websiteUrl: "https://radio.foxnews.com/podcast/trey-gowdy",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://radio.foxnews.com/podcast/trey-gowdy",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Fox News Radio identifies former Congressman Trey Gowdy as the show's host.",
      people: [{ personSlug: "trey-gowdy", role: "HOST" }],
    },
    {
      slug: "jason-in-the-house",
      title: "Jason in the House",
      rssUrl: "https://feeds.megaphone.fm/FOXM9334533161",
      active: true,
      publishingStatus: "UNKNOWN",
      verificationUrl: "https://podnews.net/podcast/i7zo1",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Podcast metadata identifies former Congressman Jason Chaffetz as the show's host.",
      people: [{ personSlug: "jason-chaffetz", role: "HOST" }],
    },
    {
      slug: "newts-world",
      title: "Newt's World",
      rssUrl:
        "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/0b197502-72fe-4046-b7b3-ae27016ec147/8b19f8a8-4942-4dd1-b38d-ae27016ec151/podcast.rss",
      websiteUrl: "https://omny.fm/shows/newts-world",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://omny.fm/shows/newts-world",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Publisher page identifies former Speaker of the House Newt Gingrich as the show's host.",
      people: [{ personSlug: "newt-gingrich", role: "HOST" }],
    },
    {
      slug: "the-doug-collins-podcast",
      title: "The Doug Collins Podcast",
      rssUrl: "https://feed.podbean.com/thedougcollinspodcast/feed.xml",
      websiteUrl: "https://thedougcollinspodcast.podbean.com/",
      active: true,
      publishingStatus: "UNKNOWN",
      verificationUrl: "https://thedougcollinspodcast.podbean.com/",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Publisher page identifies Doug Collins and notes his service as a former Congressman.",
      people: [{ personSlug: "doug-collins", role: "HOST" }],
    },
    {
      slug: "the-social-contract-with-joe-walsh",
      title: "The Social Contract with Joe Walsh",
      rssUrl: "https://feeds.acast.com/public/shows/66c247fb844d445153718f68",
      active: true,
      publishingStatus: "UNKNOWN",
      verificationUrl: "https://feeds.acast.com/public/shows/66c247fb844d445153718f68",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Feed metadata identifies former Congressman Joe Walsh as the show's host.",
      people: [{ personSlug: "joe-walsh", role: "HOST" }],
    },
    {
      slug: "the-quill-podcast",
      title: "The Quill Podcast",
      rssUrl: "https://anchor.fm/s/20e77e74/podcast/rss",
      websiteUrl: "https://lemieuxcenter.org/",
      active: true,
      publishingStatus: "UNKNOWN",
      verificationUrl: "https://lemieuxcenter.org/",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Show metadata identifies former U.S. Senator George LeMieux as a co-host with Dr. Robert Lloyd.",
      people: [{ personSlug: "george-lemieux", role: "COHOST" }],
    },
    {
      slug: "the-middle-with-anthony-weiner",
      title: "The Middle with Anthony Weiner",
      rssUrl: "https://feeds.megaphone.fm/WABC4595419758",
      active: true,
      publishingStatus: "UNKNOWN",
      verificationUrl: "https://podnews.net/podcast/iaimr",
      verifiedAt: "2026-10-05",
      verificationNote:
        "Podcast metadata identifies former Congressman Anthony Weiner as the show's host.",
      people: [{ personSlug: "anthony-weiner", role: "HOST" }],
    },
    {
      slug: "shadow-politics",
      title: "Shadow Politics with US Senator Michael D Brown",
      rssUrl: "https://bbsradio.com/customshow/2570",
      websiteUrl: "https://bbsradio.com/shadowpolitics",
      active: true,
      publishingStatus: "ACTIVE",
      verificationUrl: "https://bbsradio.com/shadowpolitics",
      verifiedAt: "2026-10-05",
      verificationNote:
        "BBS Radio identifies former D.C. Shadow Senator Michael D. Brown as host and exposes this endpoint as the show's Audio RSS Feed.",
      people: [{ personSlug: "michael-d-brown", role: "HOST" }],
    },
    {
      "slug": "ron-paul-liberty-report",
      "title": "Ron Paul Liberty Report",
      "rssUrl": "https://feeds.soundcloud.com/users/soundcloud:users:153940103/sounds.rss",
      "websiteUrl": "https://www.ronpaullibertyreport.com/",
      "publishingStatus": "ACTIVE",
      "verificationUrl": "https://www.podbean.com/podcast-detail/nctjq-357b1/Ron-Paul-Liberty-Report-Podcast",
      "verificationNote": "The podcast directory identifies former Rep. Ron Paul as the creator and publishes this exact SoundCloud RSS address.",
      "people": [
        {
          "personSlug": "ron-paul",
          "role": "HOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "the-matt-gaetz-show",
      "title": "The Matt Gaetz Show",
      "rssUrl": "https://www.spreaker.com/show/6461238/episodes/feed",
      "websiteUrl": "https://www.spreaker.com/podcast/the-matt-gaetz-show--6461238",
      "publishingStatus": "ACTIVE",
      "verificationUrl": "https://podstatus.com/podcasts/the-matt-gaetz-show-29217",
      "verificationNote": "Spreaker and Podstatus identify former Rep. Matt Gaetz as the show's presenter and publish the exact show-specific Spreaker feed.",
      "people": [
        {
          "personSlug": "matt-gaetz",
          "role": "HOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "the-anchormen-show-with-matt-gaetz",
      "title": "The Anchormen Show with Matt Gaetz (formerly Firebrand)",
      "rssUrl": "https://anchor.fm/s/ea4136c/podcast/rss",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/the-anchormen-show-with-matt-gaetz/id1512848110",
      "publishingStatus": "ACTIVE",
      "verificationUrl": "https://www.podbean.com/podcast-detail/38hjz-cc1cf/The-Anchormen-Show-with-Matt-Gaetz-Podcast",
      "verificationNote": "Publisher directories identify Matt Gaetz as host, document the rebranding of Firebrand into Anchormen, and give the exact Anchor RSS feed. This is distinct from his OAN program.",
      "people": [
        {
          "personSlug": "matt-gaetz",
          "role": "HOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "the-kinzinger-report",
      "title": "The Kinzinger Report",
      "rssUrl": "https://feeds.redcircle.com/f8897293-bba3-4bfb-beac-6582a4e21176",
      "websiteUrl": "https://redcircle.com/shows/the-kinzinger-report",
      "publishingStatus": "ACTIVE",
      "verificationUrl": "https://podstatus.com/podcasts/the-kinzinger-report-1400053",
      "verificationNote": "Podstatus identifies former Rep. Adam Kinzinger as host and publishes this exact RedCircle feed.",
      "people": [
        {
          "personSlug": "adam-kinzinger",
          "role": "HOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "the-hot-dish",
      "title": "The Hot Dish",
      "rssUrl": "https://feeds.transistor.fm/the-hot-dish",
      "websiteUrl": "https://thehotdish.transistor.fm/",
      "publishingStatus": "ACTIVE",
      "verificationUrl": "https://thehotdish.transistor.fm/people",
      "verificationNote": "The publisher names former Senator Heidi Heitkamp a recurring host; the podcast is hosted on Transistor, whose canonical feed path corresponds to the show's slug.",
      "people": [
        {
          "personSlug": "heidi-heitkamp",
          "role": "COHOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "grounded-with-jon-tester",
      "title": "Grounded with Jon Tester & Maritsa Georgiou",
      "rssUrl": "https://feed.podbean.com/groundedpodcast/feed.xml",
      "websiteUrl": "https://groundedpodcast.podbean.com/",
      "publishingStatus": "ACTIVE",
      "verificationUrl": "https://groundedpodcast.podbean.com/",
      "verificationNote": "Podbean's publisher page identifies former Senator Jon Tester as co-host; Podbean documents the canonical feed format for groundedpodcast.podbean.com.",
      "people": [
        {
          "personSlug": "jon-tester",
          "role": "COHOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "you-and-me-both-with-hillary-clinton",
      "title": "You and Me Both with Hillary Clinton",
      "rssUrl": "https://feeds.megaphone.fm/HSW5162563163",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/you-and-me-both-with-hillary-clinton/id1531768983",
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/you-and-me-both-with-hillary-clinton/id1531768983",
      "verificationNote": "Podcast directories credit former Senator Hillary Clinton as host and list this Megaphone feed; retained as a historical series.",
      "people": [
        {
          "personSlug": "hillary-clinton",
          "role": "HOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "why-am-i-telling-you-this-with-bill-clinton",
      "title": "Why Am I Telling You This? with Bill Clinton",
      "rssUrl": "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/075d44aa-9a1e-41aa-8055-ae280053272e/00d87679-75e5-4544-b86a-ae2800532740/podcast.rss",
      "websiteUrl": "https://omny.fm/shows/why-am-i-telling-you-this-with-bill-clinton/playlists/podcast",
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podnews.net/podcast/i6313",
      "verificationNote": "Podcast directories and Omny identify former President Bill Clinton as host; the exact Omny feed was recovered from Podnews's RSS link.",
      "people": [
        {
          "personSlug": "bill-clinton",
          "role": "HOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "the-tulsi-gabbard-show",
      "title": "The Tulsi Gabbard Show",
      "rssUrl": "https://feeds.redcircle.com/32ce4f6e-2809-4a1a-82dd-69e0baec3936",
      "websiteUrl": "https://redcircle.com/shows/this-is-tulsi",
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://www.podbean.com/podcast-detail/t87uy-192ff5/The-Tulsi-Gabbard-Show-Podcast",
      "verificationNote": "Apple lists former Rep. Tulsi Gabbard as the host and the podcast directory supplies the exact RedCircle RSS feed; a historical series.",
      "people": [
        {
          "personSlug": "tulsi-gabbard",
          "role": "HOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "morning-joe",
      "title": "Morning Joe",
      "rssUrl": "https://podcastfeeds.nbcnews.com/msnbc-morning-joe",
      "websiteUrl": "https://www.ms.now/morning-joe",
      "publishingStatus": "ACTIVE",
      "verificationUrl": "https://plinkhq.com/i/974299441/e/1000784355695",
      "verificationNote": "Publisher metadata identifies former Rep. Joe Scarborough as a regular host. Plink publishes this official podcast RSS endpoint; news broadcasts have a matching audio podcast feed.",
      "people": [
        {
          "personSlug": "joe-scarborough",
          "role": "COHOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "from-the-kitchen-table-the-duffys",
      "title": "From the Kitchen Table: The Duffys",
      "rssUrl": "https://feeds.megaphone.fm/FOXM2989303860",
      "websiteUrl": "https://radio.foxnews.com/podcast/from-the-kitchen-table/",
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podstatus.com/podcasts/from-the-kitchen-table-the-duffys-24944",
      "verificationNote": "Fox/Apple identify former Rep. Sean Duffy as co-host, and Podstatus provides the exact Megaphone RSS URL. The series concluded in 2024.",
      "people": [
        {
          "personSlug": "sean-duffy",
          "role": "COHOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "canarycast-with-sherrod-brown",
      "title": "Canarycast",
      "rssUrl": "https://feeds.soundcloud.com/users/soundcloud%3Ausers%3A334970098/sounds.rss",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/canarycast/id1292084414",
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podnews.net/podcast/i51cl",
      "verificationNote": "Apple and Podnews credit former Senator Sherrod Brown as host; the exact SoundCloud RSS URL comes from the Podnews RSS link. Historical 2017–2018 series.",
      "people": [
        {
          "personSlug": "sherrod-brown",
          "role": "HOST"
        }
      ],
      "active": true,
      "verifiedAt": "2026-10-09"
    },
    {
      "slug": "cigar-caucus",
      "title": "Cigar Caucus",
      "rssUrl": "https://api.riverside.fm/hosting/n0rKAZd6.rss",
      "websiteUrl": "https://www.cigarcaucushub.com/",
      "active": true,
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/cigar-caucus/id1869131540",
      "verifiedAt": "2026-10-10",
      "verificationNote": "Apple lists former Sen. Tim Hutchinson as creator, the official publisher identifies him as host, and iTunes LookUp exposes the canonical Riverside RSS. The publisher explicitly describes a pause after 44 episodes.",
      "people": [
        {
          "personSlug": "tim-hutchinson",
          "role": "HOST"
        }
      ]
    },
    {
      "slug": "inside-new-mexico-with-steve-pearce",
      "title": "Inside New Mexico with Steve Pearce",
      "rssUrl": "https://anchor.fm/s/9960eac/podcast/rss",
      "websiteUrl": "https://newmexico.gop/",
      "active": true,
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/inside-new-mexico-with-steve-pearce/id1455383209",
      "verifiedAt": "2026-10-10",
      "verificationNote": "Apple and Podnews identify former Rep. Steve Pearce as weekly host; iTunes LookUp returns the exact Anchor/Spotify RSS. Historical podcast archive through 2025.",
      "people": [
        {
          "personSlug": "steve-pearce",
          "role": "HOST"
        }
      ]
    },
    {
      "slug": "politicsaside-with-jon-porter",
      "title": "PoliticsAside",
      "rssUrl": "https://rss.buzzsprout.com/1983668.rss",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/politicsaside/id1622471150",
      "active": true,
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/politicsaside/id1622471150",
      "verifiedAt": "2026-10-10",
      "verificationNote": "Apple identifies former Rep. Jon Porter as host and creator; iTunes LookUp returns the exact show-specific Buzzsprout RSS. The archived show published through 2024.",
      "people": [
        {
          "personSlug": "jon-porter",
          "role": "HOST"
        }
      ]
    },
    {
      "slug": "coalition-of-the-sane",
      "title": "Coalition of the Sane",
      "rssUrl": "https://feeds.megaphone.fm/MTH7739677395",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/coalition-of-the-sane/id1741663279",
      "active": true,
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/coalition-of-the-sane/id1741663279",
      "verifiedAt": "2026-10-10",
      "verificationNote": "Apple identifies former Rep. Denver Riggleman as program host; iTunes LookUp provides the show's dedicated Megaphone RSS. Archive includes episodes from 2024.",
      "people": [
        {
          "personSlug": "denver-riggleman",
          "role": "HOST"
        }
      ]
    },
    {
      "slug": "warrior-money",
      "title": "Warrior Money",
      "rssUrl": "https://feeds.megaphone.fm/YFL2979942126",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/warrior-money/id1779749359",
      "active": true,
      "publishingStatus": "UNKNOWN",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/warrior-money/id1779749359",
      "verifiedAt": "2026-10-10",
      "verificationNote": "Apple explicitly names former Rep. Patrick J. Murphy and Dan Kunze as co-hosts; iTunes LookUp supplies the canonical Megaphone RSS.",
      "people": [
        {
          "personSlug": "patrick-j-murphy",
          "role": "COHOST"
        }
      ]
    },
    {
      "slug": "mtg-with-marjorie-taylor-greene",
      "title": "MTG",
      "rssUrl": "https://anchor.fm/s/9e2ddedc/podcast/rss",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/mtg/id1629021100",
      "active": true,
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/mtg/id1629021100",
      "verifiedAt": "2026-10-10",
      "verificationNote": "Apple lists former Rep. Marjorie Taylor Greene as creator and speaker; iTunes LookUp supplies the historical Anchor RSS. Twenty-six episodes published in 2022.",
      "people": [
        {
          "personSlug": "marjorie-taylor-greene",
          "role": "HOST"
        }
      ]
    },
    {
      "slug": "doing-time-with-george-santos",
      "title": "Doing Time with George Santos (formerly Pants On Fire)",
      "rssUrl": "https://feeds.megaphone.fm/IMP8216678538",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/doing-time-with-george-santos/id1784810554",
      "active": true,
      "publishingStatus": "UNKNOWN",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/doing-time-with-george-santos/id1784810554",
      "verifiedAt": "2026-10-10",
      "verificationNote": "The former Rep. George Santos hosts this podcast, previously named Pants On Fire; Apple's latest metadata identifies the series as Doing Time and returns its canonical Megaphone feed. Treat its two titles as one series, not separate shows.",
      "people": [
        {
          "personSlug": "george-santos",
          "role": "HOST"
        }
      ]
    },
    {
      "slug": "bowman-and-bush",
      "title": "Bowman and Bush",
      "rssUrl": "https://api.substack.com/feed/podcast/2325511/s/197831.rss",
      "websiteUrl": "https://zeteo.com/s/bowman-and-bush",
      "active": true,
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/bowman-and-bush/id1801534903",
      "verifiedAt": "2026-10-10",
      "verificationNote": "Publisher Zeteo explicitly identifies former Representatives Cori Bush and Jamaal Bowman as series cohosts. Apple's show-specific listing confirms their participation, and Apple LookUp ID 1801534903 returns this exact show-specific Substack RSS feed.",
      "people": [
        {
          "personSlug": "cori-bush",
          "role": "COHOST"
        },
        {
          "personSlug": "jamaal-bowman",
          "role": "COHOST"
        }
      ]
    },
    {
      "slug": "kasich-and-klepper",
      "title": "Kasich & Klepper",
      "rssUrl": "https://feeds.megaphone.fm/TREE3290263903",
      "websiteUrl": "https://podcasts.apple.com/us/podcast/kasich-klepper/id1606026612",
      "active": true,
      "publishingStatus": "INACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/kasich-klepper/id1606026612",
      "verifiedAt": "2026-10-10",
      "verificationNote": "Apple identifies former Rep. John Kasich and Jordan Klepper as cohosts of this 2022-2024 series; Apple LookUp ID 1606026612 resolves this exact Megaphone RSS.",
      "people": [
        {
          "personSlug": "john-kasich",
          "role": "COHOST"
        }
      ]
    },
    {
      "slug": "the-cloakroom-with-peter-roskam",
      "title": "The Cloakroom with Peter Roskam",
      "rssUrl": "https://feeds.captivate.fm/bakerhosts/the-cloakroom-with-peter-roskam/",
      "websiteUrl": "https://www.bakerlaw.com/podcasts/the-cloakroom/",
      "active": true,
      "publishingStatus": "ACTIVE",
      "verificationUrl": "https://podcasts.apple.com/us/podcast/the-cloakroom-with-peter-roskam-bakerhosts/id1759425935",
      "verifiedAt": "2026-10-10",
      "verificationNote": "BakerHostetler explicitly identifies former Congressman Peter Roskam as host, and Apple LookUp ID 1759425935 resolves this SHOW-SPECIFIC Captivate feed (not the general mixed BakerHosts podcast feed).",
      "people": [
        {
          "personSlug": "peter-roskam",
          "role": "HOST"
        }
      ]
    },
  ],
  candidates: [
    {
      "person": "Claire McCaskill",
      "show": "How to Win 2024",
      "sourceUrl": "https://www.ms.now/how-to-win",
      "reason": "Former Senator McCaskill co-hosted this historic series, but its RSS is now shared with a newer Jen Psaki series. A title/episode-date filter is required before ingestion to prevent attributing unrelated episodes to her."
    },
    {
      "person": "Paul Hodes",
      "show": "Beyond Politics",
      "sourceUrl": "https://beyondpoliticspodcast.com/about",
      "reason": "Former Rep. Hodes was a verified co-host; the continuing publisher now credits Matt Robison alone. Need host-date boundaries to avoid misattribution of episodes after Hodes departed."
    },
    {
      "person": "Paul Hodes",
      "show": "Capitol Close Up",
      "sourceUrl": "https://beyondpoliticspodcast.com/capitolcloseuppodcast",
      "reason": "Former Rep. Hodes participated as a recurring host; identify the canonical archive feed and confirm recurring-host boundaries."
    },
    {
      "person": "Sherrod Brown",
      "show": "Additional historical Sherrod Brown programs",
      "sourceUrl": "https://podcasts.apple.com/us/podcast/canarycast/id1292084414",
      "reason": "Canarycast has been added; watch for any separately distributed additional official podcasts, rather than equating guest appearances to hosted shows."
    },
    {
      "person": "Jon Porter",
      "show": "PoliticsAside",
      "sourceUrl": "https://podcasts.apple.com/us/podcast/politicsaside/id1817902599",
      "reason": "The former representative is identified as a show host by Apple; recover the exact canonical RSS and check archival audio accessibility before automated ingestion."
    },
    {
      "person": "Patrick J. Murphy",
      "show": "Warrior Money",
      "sourceUrl": "https://podcasts.apple.com/us/podcast/warrior-money/id1772610042",
      "reason": "Former Rep. Murphy appears as a host; verify the specific member identity and discover an exact open RSS feed."
    },
    {
      "person": "Denver Riggleman",
      "show": "Coalition of the Sane",
      "sourceUrl": "https://podcasts.apple.com/us/podcast/coalition-of-the-sane/id1805455641",
      "reason": "Former Rep. Riggleman hosts this series; recover the canonical audio RSS feed before ingestion."
    },






    {
      person: "Mike Levin",
      show: "Listening with Levin",
      sourceUrl:
        "https://levin.house.gov/media/press-releases/rep-mike-levin-launches-new-podcast-listening-with-levin",
      reason:
        "Official House announcement verifies the podcast; canonical public RSS feed still needs recovery.",
    },


    {
      person: "Mark Alford",
      show: "Mark Alford's America",
      sourceUrl: "https://alford.house.gov/alfords-america-archive/",
      reason:
        "Official House archive explicitly calls it Rep. Alford's radio show/podcast; no canonical open RSS feed has been located.",
    },

    {
      person: "Andy Biggs",
      show: "What's the BIGGS Idea?",
      sourceUrl: "https://biggs.house.gov/media/whats-biggs-idea-podcast",
      reason:
        "Official House page verifies the series, but current distribution is primarily YouTube/Rumble and the historical audio RSS feed still needs recovery.",
    },
    {
      person: "Jeff Crank",
      show: "American Potential",
      sourceUrl: "https://americanpotential.podbean.com/",
      reason:
        "Jeff Crank previously hosted the show, but it now continues under David From. Ingestion needs host-date boundaries before the continuing feed can be safely attached to Crank's archive.",
    },
    {
      person: "Bernie Sanders",
      show: "The Bernie Sanders Show",
      sourceUrl: "https://podcasts.apple.com/us/podcast/the-bernie-sanders-show/id1223800705",
      reason:
        "Host relationship is verified, but the canonical RSS feed still needs to be recovered before ingestion.",
    },
    {
      person: "Barack Obama",
      show: "Renegades: Born in the USA",
      sourceUrl: "https://rss.art19.com/renegades-born-in-the-usa",
      reason:
        "The host relationship and feed are known, but the public feed currently lacks a usable episode archive.",
    },
    {
      person: "Lisa Murkowski",
      show: "The Icebreaker",
      sourceUrl:
        "https://www.murkowski.senate.gov/press/release/murkowski-launches-the-icebreaker-podcast",
      reason:
        "The official Senate announcement verifies the show, but a stable canonical podcast RSS feed still needs to be identified.",
    },
  ],
};
