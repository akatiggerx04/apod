# 🪐 Astronomy Picture of The Day (Alternative Interface)

An alternative interface for NASA's Astronomy Picture of the Day (APOD), providing an alternative interface to explore the daily astronomical images and explanations from APOD. This project builds upon the amazing work of [Robert Nemiroff](http://www.phy.mtu.edu/faculty/Nemiroff.html) and [Jerry Bonnell](https://apod.nasa.gov/htmltest/jbonnell/www/bonnell.html) who created and maintain the original APOD website [(apod.nasa.gov)](https://apod.nasa.gov). All content and credit goes to the original APOD service and its contributors.

## Embedding APOD

You can embed the Astronomy Picture of the Day (APOD) in your website in two ways:

### Today's APOD

To display today's APOD image, use the following iframe code:

```html
<iframe
  src="https://apod.akatgx.link/embed"
  width="250px"
  height="250px"
  title="Astronomy Picture of The Day"
>
</iframe>
```

### Specific Date's APOD

To display an APOD from a specific date, add the `date` parameter in YYYY-MM-DD format:

```html
<iframe
  src="https://apod.akatgx.link/embed?date=2010-12-10"
  width="250px"
  height="250px"
  title="Astronomy Picture of The Day"
>
</iframe>
```

The above example loads the APOD from December 10, 2010.

## Parser

This project utilizes a custom Typescript parser for NASA's APOD service. The parser fetches and processes data from apod.nasa.gov through a CORS proxy, returning structured JSON responses.

### Usage

The parser is located at `src/lib/apod.ts` and exposes the following function:

```typescript
import { fetchAPOD } from "apod";

interface APODOptions {
  startDate: string | Date;      // Start date to fetch from
  endDate?: string | Date;       // Optional end date (defaults to start date)
  useDefaultDate?: boolean;      // Use current date if no dates specified
}

const apod = await fetchAPOD(options);
```

### Response Schema

The parser returns APOD entries in the following JSON format:

```typescript
interface APODResponse {
  url?: string; // Direct URL to image/video content
  hdurl?: string; // High-resolution image URL if available
  title?: string; // Title of the astronomy picture
  explanation?: string; // Detailed explanation of the image/phenomenon
  credits: string | null; // Attribution and credits
  copyright: string | null; // Copyright information when applicable
  media_type: "image" | "video" | "other"; // Type of media content
  date: string; // Date of the APOD (YYYY-MM-DD)
  link: string; // Original APOD page URL
  error?: boolean; // Indicates if there was a problem during fetching or parsing
}
```
## Contributing

Contributions to improve this project are welcome! Here's how you can help:

1. Fork the repository
2. Create a new branch for your feature or fix
3. Make your changes and commit them with clear messages
4. Push to your fork and submit a pull request

Please ensure your PR:
- Follows the existing code style
- Includes relevant tests if applicable
- Updates documentation as needed
- Describes the changes made and their purpose

For major changes, please open an issue first to discuss what you would like to change.


## Credits

The Astronomy Picture of the Day (APOD) service is created and maintained by:

- [Dr. Robert Nemiroff](http://www.phy.mtu.edu/faculty/Nemiroff.html) (Michigan Technological University)
- [Dr. Jerry Bonnell](https://apod.nasa.gov/htmltest/jbonnell/www/bonnell.html) (UMCP)

All images and content are credited to their respective owners and copyright holders as noted in each daily entry. This alternative interface is an independent project that builds upon and showcases APOD's content while respecting all original attributions.
