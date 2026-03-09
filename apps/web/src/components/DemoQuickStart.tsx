import { getBearerToken, setBearerToken } from "../auth/tokenStore";
import { Button, Card } from "./ui";

interface DemoQuickStartProps {
  view: "dispatcher" | "technician" | "client";
}

const applyTokenAndRoute = (token: string, hash: string) => {
  setBearerToken(token);
  window.location.hash = hash;
  window.location.reload();
};

const tokenPersonaMap: Record<string, string> = {
  "demo-dispatcher-token": "Demo Dispatcher",
  "demo-ava-token": "Ava (Technician)",
  "demo-ben-token": "Ben (Technician)",
  "demo-client-1-token": "Client One",
  "demo-client-2-token": "Client Two",
};

export const DemoQuickStart = ({ view }: DemoQuickStartProps) => {
  const activeToken = getBearerToken();
  const activePersona = tokenPersonaMap[activeToken] ?? "Custom token user";

  return (
    <Card
      title="Demo Start"
      subtitle="Quickly switch tokens, and jump between demo routes."
    >
      <p className="mb-3 text-sm text-slate-600">
        Impersonating:{" "}
        <span className="font-semibold text-slate-900">{activePersona}</span>{" "}
        <span className="text-xs text-slate-500">({activeToken})</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {view !== "dispatcher" ? (
          <Button
            variant="secondary"
            onClick={() =>
              applyTokenAndRoute("demo-dispatcher-token", "dispatcher")
            }
          >
            Use Dispatcher Token
          </Button>
        ) : null}
        {view !== "technician" ? (
          <Button
            variant="secondary"
            onClick={() => applyTokenAndRoute("demo-ava-token", "technician")}
          >
            Use Ava Tech Token
          </Button>
        ) : null}
        {view !== "technician" ? (
          <Button
            variant="secondary"
            onClick={() => applyTokenAndRoute("demo-ben-token", "technician")}
          >
            Use Ben Tech Token
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => applyTokenAndRoute("demo-client-1-token", "client")}
        >
          Use Client 1 Token
        </Button>
        <Button
          variant="secondary"
          onClick={() => applyTokenAndRoute("demo-client-2-token", "client")}
        >
          Use Client 2 Token
        </Button>
      </div>
    </Card>
  );
};
