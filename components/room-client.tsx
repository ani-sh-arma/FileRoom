"use client";

import type React from "react";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/seperator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Download, Trash2 } from "lucide-react";

type FileRow = {
  id: number;
  room_slug: string;
  file_name: string;
  blob_url: string;
  size: number;
  content_type: string | null;
  uploaded_at: string;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
  });

async function uploadFile(url: string, { arg }: { arg: { file: File } }) {
  const fd = new FormData();
  fd.append("file", arg.file);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Upload failed");
  }
  return res.json();
}

async function authRoom(url: string, { arg }: { arg: { password: string } }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Auth failed");
  }
  return res.json();
}

export default function RoomClient(props: {
  slug: string;
  isPrivate: boolean;
  authed: boolean;
}) {
  const { slug, isPrivate, authed } = props;
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { data, error, isLoading, mutate } = useSWR<{ files: FileRow[] }>(
    authed || !isPrivate ? `/api/rooms/${slug}/files` : null,
    fetcher
  );

  const { trigger: upload, isMutating: uploading } = useSWRMutation(
    `/api/rooms/${slug}/upload`,
    uploadFile
  );
  const { trigger: authenticate, isMutating: authenticating } = useSWRMutation(
    `/api/rooms/${slug}/auth`,
    authRoom
  );

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      await upload({ file });
      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
      setFile(null);
      await mutate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: message,
      });
    }
  };

  const onAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authenticate({ password });
      toast({
        title: "Access Granted",
        description: "You can now view the files.",
      });
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: message,
      });
    }
  };

  const onDeleteFile = async (fileId: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      const res = await fetch(`/api/rooms/${slug}/files/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({
        title: "File Deleted",
        description: "The file has been deleted successfully.",
      });
      await mutate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: message,
      });
    }
  };

  if (isPrivate && !authed) {
    return (
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Enter Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAuth} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={authenticating}>
              {authenticating ? "Checking..." : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload a file</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onUpload}
            className={`flex ${isMobile ? "flex-col" : "items-center"} gap-3`}
          >
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="submit"
              disabled={!file || uploading}
              className={isMobile ? "w-full" : ""}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading...</p>}
          {error && <p className="text-destructive">Failed to load files</p>}
          {!isLoading && !error && (
            <ul className="flex flex-col gap-3">
              {data?.files?.length ? (
                data.files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <a
                          href={f.blob_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {f.file_name}
                        </a>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(f.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        title="Download"
                      >
                        <a
                          href={`/api/rooms/${slug}/download/${encodeURIComponent(
                            f.file_name
                          )}`}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => onDeleteFile(f.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-muted-foreground">
                  No files yet. Be the first to upload!
                </p>
              )}
            </ul>
          )}
        </CardContent>
        <CardFooter />
      </Card>
    </div>
  );
}
