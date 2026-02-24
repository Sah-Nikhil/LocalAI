# DocChat Frontend

The DocChat frontend is a modern, responsive web application built with Next.js 16 and Tailwind CSS 4. It provides an intuitive interface for uploading documents and interacting with them through a local AI assistant.

---

## Features

- **Responsive Design**: Optimized for various screen sizes using Tailwind CSS.
- **Dynamic Model Selection**: Allows users to switch between different LLMs and VLMs.
- **Real-time Chat**: Interactive chat interface with streaming-like updates and message persistence.
- **File Upload & Tracking**: Drag-and-drop file uploads with progress tracking and multi-format support.
- **Theme Support**: Integrated light and dark mode support.

---

## Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) and [Lucide Icons](https://lucide.dev/)

---

## Core Components

- **ChatArea**: The main interactive interface where document-related conversations take place.
- **UploadSidebar**: Manages document uploads and displays processing status.
- **AppSidebar**: Handles navigation and maintains chat history.
- **ModelSelector**: Interfaces with the backend to list and select available AI models.

---

## Setup & Running

1. **Install Dependencies**:

   ```bash
   pnpm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the `frontend` directory:

   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   NEXT_PUBLIC_USER_ID=your_desired_user_id
   ```

3. **Start the Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS 4 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
