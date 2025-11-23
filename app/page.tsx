import CreateRoomForm from "@/components/create-room-form";
import { ModeToggle } from "@/components/mode-toggle";

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <section className="w-full max-w-2xl text-center space-y-6">
        <h1 className="text-3xl md:text-4xl font-semibold text-balance">
          Share files in seconds with FileRoom
        </h1>
        <p className="text-muted-foreground text-pretty">
          Create a dedicated page like {'"'}your-site.com/private-page{'"'}{" "}
          where anyone can view and upload files. Make it public or require a
          password.
        </p>
      </section>
      <div className="mt-8 w-full">
        <CreateRoomForm />
      </div>
    </main>
  );
}
