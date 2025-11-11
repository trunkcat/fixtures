import { JSONPreview } from "@/components/JSONPreview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/auth";
import { HTTPError } from "ky";
import { CircleXIcon, LoaderIcon, UsersIcon } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { StageContext } from "./stage-context";

export default function StageItemsSection() {
    const { api } = useAuth();
    const { stage, stageItems, setStageItems } = useContext(StageContext);

    function fetchStageItems() {
        setStageItems({ state: "pending", message: "Fetching stage items" });

        api.get(`stages/${stage.data._id}/items`).json().then((items) => {
            setStageItems({ state: "resolved", data: items });
        }).catch((error) => {
            if (error instanceof HTTPError && error.response) {
                error.response.json().then(({ message }) => toast.error(message));
            }
            setStageItems({ state: "rejected", message: "Failed to fetch stage items" });
        });
    }

    useEffect(() => {
        fetchStageItems();
    }, [stage]);

    if (stageItems.state === "pending") {
        return (
            <div className="flex items-center justify-center gap-2">
                <LoaderIcon className="animate-spin size-5" />
            </div>
        );
    } else if (stageItems.state === "rejected") {
        return (
            <div className="flex items-center justify-center gap-2">
                <CircleXIcon className="size-5" /> {stageItems.message}
            </div>
        );
    }

    if (stage.data.type === "league") {
        return stageItems.data.map((item) => {
            return (
                <div key={item._id} className="space-y-4 w-full">
                    <div className="flex gap-2">
                        {item.roundsCount === 0
                            && <AssignTeamInputDialog stageItem={item} fetchStageItems={fetchStageItems} />}
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-inherit">
                                <TableHead className="sticky left-0 z-[2] bg-background">
                                    #
                                </TableHead>
                                <TableHead className="sticky left-0 z-[2] bg-background">
                                    Team
                                </TableHead>
                                <TableHead className="text-center">MP</TableHead>
                                <TableHead className="text-center">W</TableHead>
                                <TableHead className="text-center">D</TableHead>
                                <TableHead className="text-center">L</TableHead>
                                <TableHead className="text-center">GF</TableHead>
                                <TableHead className="text-center">GA</TableHead>
                                <TableHead className="text-center">GD</TableHead>
                                <TableHead className="text-center sticky right-0 z-[2] bg-background">Pts</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {item.inputs.map((team, i) => (
                                <TableRow key={team._id} className="hover:bg-background">
                                    <TableCell>{i + 1}</TableCell>
                                    <TableCell className="sticky left-0 z-[2] bg-background font-semibold">
                                        {team.name}
                                    </TableCell>
                                    <TableCell className="text-center">{team.teamStats.matchesPlayed}</TableCell>
                                    <TableCell className="text-center">{team.teamStats.wins}</TableCell>
                                    <TableCell className="text-center">{team.teamStats.draws}</TableCell>
                                    <TableCell className="text-center">{team.teamStats.losses}</TableCell>
                                    <TableCell className="text-center">{team.teamStats.goalsFor}</TableCell>
                                    <TableCell className="text-center">{team.teamStats.goalsAgainst}</TableCell>
                                    <TableCell className="text-center">{team.teamStats.goalDifference}</TableCell>
                                    <TableCell className="text-center sticky right-0 z-[2] bg-background font-bold">
                                        {team.teamStats.points}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* <JSONPreview data={stageItems.data} /> */}
                </div>
            );
        });
    }

    return (
        <div className="space-y-4 w-full">
            <div>unknown stage type: {stage.data.type}</div>
            <JSONPreview data={stageItems.data} />
        </div>
    );
}

/**
 * @param {{
 * fetchStageItems: () => void;
 * stageItem: Omit<Tourney.StageItem, "inputs"> & {inputs: Tourney.Team[];roundsCount: number;}
 * }} param0
 */
function AssignTeamInputDialog({ stageItem, fetchStageItems }) {
    const { api } = useAuth();
    const { stage, stageItems, setStageItems } = useContext(StageContext);

    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [teams, setTeams] = useState(
        /** @type {LoadedData<(Tourney.Team & {assigned: boolean})[]>} */ ({
            state: "pending",
            message: "Fetching teams",
        }),
    );

    useEffect(() => {
        if (!open) return;

        setTeams({ state: "pending", message: "Fetching teams" });
        Promise.all([
            api.get(`stageItem/${stageItem._id}/teams`).json(),
            api.get(`stages/${stage.data._id}/available-teams`).json(),
        ]).then(([teams, availableTeams]) => {
            setTeams({
                state: "resolved",
                data: [
                    ...teams.map((team) => ({ ...team, assigned: true })),
                    ...availableTeams.map((team) => ({ ...team, assigned: false })),
                ],
            });
        }).catch((error) => {
            if (error instanceof HTTPError && error.response) {
                error.response.json().then(({ message }) => toast.error(message));
            }
            setTeams({ state: "rejected", message: "Failed to fetch stage items" });
        });
    }, [open]);

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpening) => {
                if (saving && open) {
                    return;
                }
                setOpen(isOpening);
                if (isOpening) {
                    // form.reset()
                    // todo: reset
                }
            }}
        >
            <DialogTrigger asChild>
                <Button>
                    <UsersIcon /> Teams
                </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[80vh] max-w-[90vw] flex-col rounded-md transition-all duration-150 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Teams</DialogTitle>
                    <DialogDescription>Assign teams to the stage item</DialogDescription>
                </DialogHeader>

                <div className="grow overflow-y-scroll rounded border">
                    {teams.state === "pending"
                        ? (
                            <div className="flex flex-col justify-center items-center h-full text-muted-foreground text-sm">
                                <LoaderIcon className="animate-spin size-5" />
                            </div>
                        )
                        : teams.state === "rejected"
                        ? (
                            <div className="flex flex-col justify-center items-center h-full text-muted-foreground text-sm gap-2">
                                <CircleXIcon className="size-5" /> {teams.message}
                            </div>
                        )
                        : teams.data.length === 0
                        ? (
                            <div className="flex flex-col justify-center items-center h-full text-muted-foreground text-sm gap-2">
                                No teams that can be added here
                            </div>
                        )
                        : (
                            <div className="divide-y h-full">
                                {teams.data.map((team, i) => {
                                    return (
                                        <Label key={team._id} htmlFor={`team-${team._id}`} className="w-full">
                                            <div className="flex justify-between gap-3 p-4 w-full">
                                                <div>{team.name}</div>

                                                <Checkbox
                                                    id={`team-${team._id}`}
                                                    checked={team.assigned}
                                                    onCheckedChange={(value) => {
                                                        const updated = [...teams.data];
                                                        updated.splice(i, 1, { ...team, assigned: value });
                                                        setTeams({ state: "resolved", data: updated });
                                                    }}
                                                />
                                            </div>
                                        </Label>
                                    );
                                })}
                            </div>
                        )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={saving}>Close</Button>
                    </DialogClose>
                    <Button
                        disabled={saving || teams.state != "resolved"}
                        onClick={() => {
                            if (saving || teams.state != "resolved") return;
                            setSaving(true);

                            api.post(`stageItem/${stageItem._id}`, {
                                json: {
                                    teamIds: teams.data
                                        .filter((team) => team.assigned)
                                        .map((team) => team._id),
                                },
                            }).json().then((item) => {
                                fetchStageItems();
                            }).catch((error) => {
                                if (error instanceof HTTPError && error.response) {
                                    error.response.json().then(({ message }) => toast.error(message));
                                    return;
                                }
                                console.error(error);
                                toast.error("Something went wrong!");
                            });
                            setSaving(false);
                            setOpen(false);
                        }}
                    >
                        {saving
                            ? <LoaderIcon className="animate-spin" />
                            : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
