# Colab

This is a prototype for a shared working space for remote teams using collaborative whiteboards. It's inspired by how offices work and is part of the Remote Interaction Guidelines project developed by BBC R&D. Read more about the project here: https://rig.rd.labs.bbc/

This is a [Next.js](https://nextjs.org/) application that uses [Tailwind](https://github.com/tailwindlabs/tailwindcss) for styling, [Livekit](https://livekit.io/) for audio calls and [Liveblocks](https://liveblocks.io/) for data synchronisation. The code contains many artefacts betraying its prototype nature — the code quality and organisation will reflect that.

## Getting Started

You will need to create an account with Liveblocks and setup your own instance of Livekit. Once you have done this, you need to set environment variables in your `.env` file:

```
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_API_KEY=XXXXXX
NEXT_PUBLIC_LIVEKIT_SERVER=XXXXXX
LIVEKIT_API_KEY=XXXXXX
LIVEKIT_SECRET_KEY=XXXXXX
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Code Structure

The initial project was largely based on the initial [Liveblocks example for a whiteboard](https://liveblocks.io/examples/collaborative-whiteboard-advanced/nextjs) and was heavily customised. They have since then released [a new template](https://vercel.com/templates/next.js/liveblocks-starter-kit) which might be a better starting point. Also consider using [tldraw](https://github.com/tldraw/tldraw) if you're looking for a fully featured whiteboard.

The [Lobby page](/pages/lobby.js) connects to all the Liveblocks room and shows a preview of every room in real-time, including cursors. The lobby also includes an audio chat supported by Livekit. The [Room page](/pages/r/%5BroomId%5D.js) largely wraps the [Stage](/components/Stage.js) component and adds the Livekit audio function. Livekit has since then included a listener to check if someone is speaking while muted so the use of our [own component](/components/useMeydaAnalyser.js) should not be needed anymore.

The prototype includes a loose system of usernames, requiring users to choose a username before they can start the app. They're encourage not to use someone else's username but that is not enforced. This can be an issue if multiple people use the same username as part of the Livekit setup as it's used for their identity (though this is currently mitigated by adding a timestamp to the username). The tokens are created through a [simple local API](/pages/api/token/%5BroomId%5D.js).
 
## Credits & Licence
The prototype was designed and built by Mathieu Triay and Andrew Wood. The icons are from [Heroicons](https://heroicons.com/).

The project is licensed under the open source [BSD-3-Clause](/LICENSE) licence.

Thanks to everyone who took part in this project and helped us refine the design, in particular the Designing for Public Value team who was incredibly supportive.

Copyright BBC 2023