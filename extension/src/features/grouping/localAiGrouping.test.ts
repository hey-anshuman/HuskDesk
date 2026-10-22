import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    describeAiFailure,
    parseGroups,
    suggestLocalGroups,
} from "./localAiGrouping";

function makeTabs(count: number) {
    return Array.from({ length: count }, (_, id) => ({
        id,
        title: `Tab ${id}`,
        domain: "example.com",
    }));
}

function okResponse(groups: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: async () => ({ response: JSON.stringify({ groups }) }),
    } as unknown as Response;
}

function statusResponse(status: number): Response {
    return { ok: false, status, json: async () => ({}) } as unknown as Response;
}

beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => { });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("parseGroups", () => {
    it("parses plain and fenced JSON", () => {
        expect(parseGroups('{"groups":[{"name":"A","ids":[1]}]}')).toEqual([
            { name: "A", ids: [1] },
        ]);
        expect(parseGroups('```json\n{"groups":[]}\n```')).toEqual([]);
    });

    it("returns null for invalid output", () => {
        expect(parseGroups("not json")).toBeNull();
        expect(parseGroups('{"nope":1}')).toBeNull();
        expect(parseGroups("null")).toBeNull();
    });
});

describe("suggestLocalGroups", () => {
    it("returns groups on success", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => okResponse([{ name: "Dev", ids: [0, 1, 2] }])),
        );
        const result = await suggestLocalGroups(makeTabs(3));
        expect(result.groups).toEqual([{ name: "Dev", ids: [0, 1, 2] }]);
        expect(result.reason).toBeUndefined();
    });

    it("reports unreachable when fetch fails", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
        expect(await suggestLocalGroups(makeTabs(2))).toEqual({
            groups: null,
            reason: "unreachable",
        });
    });

    it("reports timeout", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => { throw Object.assign(new Error("timed out"), { name: "TimeoutError" }); }),
        );
        expect((await suggestLocalGroups(makeTabs(2))).reason).toBe("timeout");
    });

    it("maps HTTP statuses to reasons", async () => {
        for (const [status, reason] of [
            [403, "forbidden"],
            [404, "model-missing"],
            [500, "http-error"],
        ] as const) {
            vi.stubGlobal("fetch", vi.fn(async () => statusResponse(status)));
            expect((await suggestLocalGroups(makeTabs(2))).reason).toBe(reason);
        }
    });

    it("reports invalid-output for unusable model text", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => ({
                ok: true,
                status: 200,
                json: async () => ({ response: "sorry, I can't do that" }),
            }) as unknown as Response),
        );
        expect((await suggestLocalGroups(makeTabs(2))).reason).toBe("invalid-output");
    });

    it("reports invalid-output when the model covers too few tabs", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => okResponse([{ name: "Dev", ids: [0] }])),
        );
        expect((await suggestLocalGroups(makeTabs(10))).reason).toBe("invalid-output");
    });

    it("splits large tab lists into chunks and merges same-named groups", async () => {
        const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
            const prompt = (JSON.parse(String(init.body)) as { prompt: string }).prompt;
            const ids = [...prompt.matchAll(/"id":(\d+)/g)].map((m) => Number(m[1]));
            return okResponse([{ name: ids[0] === 0 ? "Development" : "development", ids }]);
        });
        vi.stubGlobal("fetch", fetchMock);

        const result = await suggestLocalGroups(makeTabs(35));

        expect(fetchMock.mock.calls.length).toBe(2);
        expect(result.groups).toHaveLength(1);
        expect(result.groups?.[0]?.ids).toHaveLength(35);

        const secondPrompt = (
            JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as { prompt: string }
        ).prompt;
        expect(secondPrompt.includes('["Development"]')).toBe(true);
    });

    it("does not call Ollama when there are no tabs", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        expect((await suggestLocalGroups([])).groups).toBeNull();
        expect(fetchMock.mock.calls.length).toBe(0);
    });
});

describe("describeAiFailure", () => {
    it("names the model in the missing-model message", () => {
        expect(describeAiFailure("model-missing", "gemma3:1b")).toContain("ollama pull gemma3:1b");
    });
});
