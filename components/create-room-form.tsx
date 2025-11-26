"use client";

import type React from "react";
import { useState, useEffect } from "react";
import useSWRMutation from "swr/mutation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

async function createRoomReq(
  url: string,
  { arg }: { arg: { slug: string; is_private: boolean; password?: string } }
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    // Try to extract a meaningful message
    let t = "";
    try {
      t = await res.text();
    } catch {}
    const message =
      t ||
      (res.status === 500
        ? "Server error while creating the room. Please try again."
        : "Failed to create room");
    throw new Error(message);
  }
  return res.json();
}

export default function CreateRoomForm() {
  const [slug, setSlug] = useState("");
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const { trigger, isMutating } = useSWRMutation("/api/rooms", createRoomReq);
  const { toast } = useToast();

  // Debounce slug input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSlug(slug);
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  // Check if room exists
  useEffect(() => {
    const checkRoom = async () => {
      const cleanSlug = debouncedSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (!cleanSlug) {
        setRoomExists(null);
        return;
      }

      setIsChecking(true);
      try {
        const res = await fetch(`/api/rooms/${cleanSlug}`);
        if (res.ok) {
          const data = await res.json();
          setRoomExists(data.exists);
        } else {
          setRoomExists(null);
        }
      } catch (error) {
        console.error("Failed to check room existence", error);
        setRoomExists(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkRoom();
  }, [debouncedSlug]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!cleanSlug) {
      toast({
        variant: "destructive",
        title: "Invalid Slug",
        description: "Please enter a valid slug.",
      });
      return;
    }

    // If room exists, redirect to it
    if (roomExists) {
      window.location.href = `/${cleanSlug}`;
      return;
    }

    if (isPrivate && password.length < 4) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 4 characters.",
      });
      return;
    }

    try {
      const data = await trigger({
        slug: cleanSlug,
        is_private: isPrivate,
        password: isPrivate ? password : undefined,
      });
      if (data?.room?.slug) {
        toast({
          title: "Room Created!",
          description: "Redirecting you to your new file room...",
        });
        window.location.href = `/${data.room.slug}`;
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Room created but no slug returned.",
        });
        console.log("[v0] createRoom unexpected response:", data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Failed to create room",
        description: message,
      });
      console.log("[v0] createRoom error:", message);
    }
  };

  const isButtonDisabled =
    !slug || isChecking || isMutating || (isPrivate && password.length < 4);

  return (
    <Card className="max-w-xl w-full mx-auto">
      <CardHeader>
        <CardTitle className="text-balance">Create a File Room</CardTitle>
        <CardDescription className="text-pretty">
          Pick a unique page URL where anyone can view and upload files.
          Optionally set a password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Page URL slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">/</span>
              <Input
                id="slug"
                placeholder="private-page"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1"
              />
            </div>
            {roomExists && (
              <p className="text-sm text-muted-foreground">
                This room already exists. Click below to join it.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <Label htmlFor="privacy">Make page private</Label>
              <span className="text-sm text-muted-foreground">
                Requires a password to access
              </span>
            </div>
            <Switch
              id="privacy"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={roomExists === true}
            />
          </div>

          {isPrivate && !roomExists && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isButtonDisabled}
            className="self-start"
          >
            {isMutating || isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isChecking ? "Checking..." : "Creating..."}
              </>
            ) : roomExists ? (
              "Go to room"
            ) : (
              "Create Page"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
