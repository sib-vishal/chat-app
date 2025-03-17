"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

export function useSocket(userId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create socket connection
    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
      {
        query: { userId },
      }
    );

    // Set up event listeners
    socketInstance.on("connect", () => {
      console.log("Socket connected!");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected!");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
      setIsConnected(false);
    });

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [userId]);

  return { socket, isConnected };
}
