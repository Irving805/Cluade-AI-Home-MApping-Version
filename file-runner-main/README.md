# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/a4d9688c-30af-485d-8959-2e5bd944571c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a4d9688c-30af-485d-8959-2e5bd944571c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deployment to cPanel /price (Static Hosting)

This project is configured for static deployment to a subfolder on shared hosting.

### Build Steps

```bash
# 1. Install dependencies
npm install

# 2. Build the static files
npm run build

# 3. The build output will be in the /dist folder
```

### Upload to cPanel

1. Open your cPanel File Manager
2. Navigate to `public_html/price/` (create the `price` folder if it doesn't exist)
3. Upload ALL contents from your local `/dist` folder into `public_html/price/`
   - This includes: `index.html`, `assets/` folder, and any other generated files
4. Access the page at: `https://nancyshousekeepingservice.com/price/`

### Notes

- **No server configuration required**: Uses HashRouter for client-side routing
- **Relative paths**: All assets use relative paths (`./`) so the app works from any subfolder
- **Moving to /pricing**: Simply upload the same `/dist` contents to `public_html/pricing/` instead
- **No environment variables required**: The build works on any clean machine with Node.js

### Verify the Build

```bash
# Preview the production build locally
npm run preview
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a4d9688c-30af-485d-8959-2e5bd944571c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
