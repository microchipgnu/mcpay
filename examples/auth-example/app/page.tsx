"use client";

import { signIn, useSession, signOut } from "../auth-client";
import { useState } from "react";

export default function Login() {
  const { data: session, error, isPending } = useSession();
  const [secretResponse, setSecretResponse] = useState<string | null>(null);
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);

  const doGithubSignIn = () => {
    signIn.social({
      provider: "github",
      callbackURL: window.location.href,
    });
  };

  const doSignOut = () => {
    signOut();
  };

  const callSecretEndpoint = async () => {
    setIsLoadingSecret(true);
    setSecretResponse(null);
    
    try {
      const response = await fetch('/api/secret');
      const data = await response.json();
      
      if (response.ok) {
        setSecretResponse(`✅ Success! User: ${data.user?.email || data.user?.name || 'Unknown'}`);
      } else {
        setSecretResponse(`❌ Error: ${data.message || 'Request failed'}`);
      }
    } catch (error) {
      setSecretResponse(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingSecret(false);
    }
  };

  if (session) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          background: "white",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          textAlign: "center",
          maxWidth: "400px",
          width: "100%"
        }}>
          <div style={{
            width: "60px",
            height: "60px",
            background: "#10b981",
            borderRadius: "50%",
            margin: "0 auto 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px"
          }}>
            ✓
          </div>
          <h1 style={{ margin: "0 0 0.5rem", color: "#1f2937", fontSize: "1.5rem" }}>
            Welcome back!
          </h1>
          <p style={{ margin: "0 0 1.5rem", color: "#6b7280" }}>
            Logged in as <strong>{session.user.email || session.user.name || "GitHub User"}</strong>
          </p>
          
          <button
            onClick={callSecretEndpoint}
            disabled={isLoadingSecret}
            style={{
              background: "#10b981",
              color: "white",
              padding: "0.75rem 1.5rem",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: isLoadingSecret ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              width: "100%",
              marginBottom: "1rem",
              opacity: isLoadingSecret ? 0.7 : 1
            }}
            onMouseOver={(e) => {
              if (!isLoadingSecret) {
                e.currentTarget.style.background = "#059669";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseOut={(e) => {
              if (!isLoadingSecret) {
                e.currentTarget.style.background = "#10b981";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {isLoadingSecret ? (
              <>
                <div style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #ffffff40",
                  borderTop: "2px solid #ffffff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  display: "inline-block",
                  marginRight: "0.5rem"
                }} />
                Calling Secret API...
              </>
            ) : (
              "🔐 Call Secret API"
            )}
          </button>

          {secretResponse && (
            <div style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              background: secretResponse.includes("✅") ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${secretResponse.includes("✅") ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: "6px",
              color: secretResponse.includes("✅") ? "#166534" : "#dc2626",
              fontSize: "0.875rem",
              textAlign: "left"
            }}>
              {secretResponse}
            </div>
          )}

          <button
            onClick={doSignOut}
            style={{
              background: "#ef4444",
              color: "white",
              padding: "0.75rem 1.5rem",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
              width: "100%"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#dc2626";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        background: "white",
        padding: "2rem",
        borderRadius: "12px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        textAlign: "center",
        maxWidth: "400px",
        width: "100%"
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          background: "#3b82f6",
          borderRadius: "50%",
          margin: "0 auto 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px"
        }}>
          🔐
        </div>
        <h1 style={{ margin: "0 0 0.5rem", color: "#1f2937", fontSize: "1.5rem" }}>
          Welcome to MCPay
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280" }}>
          Sign in with your GitHub account to get started
        </p>
        
        <button
          onClick={doGithubSignIn}
          disabled={isPending}
          style={{
            background: "#24292f",
            color: "white",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: isPending ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            opacity: isPending ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!isPending) {
              e.currentTarget.style.background = "#1a1a1a";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseOut={(e) => {
            if (!isPending) {
              e.currentTarget.style.background = "#24292f";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          {isPending ? (
            <>
              <div style={{
                width: "16px",
                height: "16px",
                border: "2px solid #ffffff40",
                borderTop: "2px solid #ffffff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              Signing in...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </>
          )}
        </button>
        
        {error && (
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#dc2626",
            fontSize: "0.875rem"
          }}>
            {error.message}
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
