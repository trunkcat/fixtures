import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/auth";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { endOfYesterday, format, isBefore } from "date-fns";
import { HTTPError } from "ky";
import { CalendarIcon, LoaderIcon, MinusIcon, NotebookPenIcon, PlusIcon } from "lucide-react";
import { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { ClubContext } from "./club-context";

const tournamentSchema = z.object({
    name: z.string().trim().min(3).max(256),
    dateRange: z.object({
        from: z.date().optional(),
        to: z.date().optional(),
    }),
    // clubId: z.string().trim().min(1),
    // startTime: z.iso.datetime().optional(), // todo: convert to datetime
    // endTime: z.iso.datetime().optional(),
    settings: z.object({
        rankingConfig: z.object({
            winPoints: z.number().min(0).default(3),
            drawPoints: z.number().min(0).default(1),
            lossPoints: z.number().default(0), // set up a min value (can go negative)
            addScorePoints: z.boolean().default(false),
        }).optional(),
    }).optional(),
});

export default function CreateTournamentDialog() {
    const { club, tournaments, setTournaments } = useContext(ClubContext);
    const { api } = useAuth();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const form = useForm({
        resolver: zodResolver(tournamentSchema),
        defaultValues: {
            name: "",
            dateRange: {
                from: undefined,
                to: undefined,
            },
            settings: {
                rankingConfig: {
                    winPoints: 3,
                    drawPoints: 1,
                    lossPoints: 0,
                    addScorePoints: false,
                },
            },
        },
    });

    /** @param {z.infer<typeof tournamentSchema>} values */
    function onSubmit(values) {
        if (isCreating) return;
        setIsCreating(true);

        api.post("tournaments", {
            json: {
                name: values.name,
                clubId: club.data._id,
                startTime: values.dateRange.from,
                endTime: values.dateRange.to,
                settings: {
                    rankingConfig: {
                        winPoints: values.settings?.rankingConfig?.winPoints,
                        drawPoints: values.settings?.rankingConfig?.drawPoints,
                        lossPoints: values.settings?.rankingConfig?.lossPoints,
                        addScorePoints: values.settings?.rankingConfig?.addScorePoints,
                    },
                },
            },
        }).json().then((tournament) => {
            setTournaments({
                state: "resolved",
                data: [{
                    _id: tournament.tournamentId,
                    clubId: club.data._id,
                    name: values.name,
                    createdAt: new Date(),
                    startTime: values.dateRange.from,
                    endTime: values.dateRange.to,
                    settings: values.settings, // for now, good
                }, ...tournaments.data],
            });

            // navigate(`/tournaments/${tournament.tournamentId}`);
            form.reset();
            toast.success("Done!");
            setIsOpen(false);
        }).catch((error) => {
            if (error instanceof HTTPError && error.response) {
                error.response.json()
                    .then((result) => toast.error(result.message));
                return;
            }
            toast.error(error.message);
        }).finally(() => {
            setIsCreating(false);
        });
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(isOpening) => {
                if (isCreating && isOpen) {
                    return;
                }
                setIsOpen(isOpening);

                if (isOpening) {
                    form.reset();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button>
                    <NotebookPenIcon /> Create
                </Button>
            </DialogTrigger>

            <Form {...form}>
                <form>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Tournament</DialogTitle>
                            <DialogDescription>
                                Create a new tournament under your club.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tournament name</FormLabel>
                                        <FormControl>
                                            <Input autoComplete="off" placeholder="UEFA Champions League" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="dateRange"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col w-full">
                                        <FormLabel>Starts and end dates</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground",
                                                        )}
                                                    >
                                                        {field.value.from
                                                            ? (
                                                                <span>
                                                                    {format(field.value.from, "PPP")}
                                                                    &ndash;
                                                                    {field.value.to
                                                                        && format(field.value.to, "PPP")}
                                                                </span>
                                                            )
                                                            : <span>Pick dates</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="range"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    min={1}
                                                    disabled={(/** @type {Date} */ date) =>
                                                        isBefore(date, endOfYesterday())}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription>
                                            <i>Optional</i>. The start and end dates of the tournament. This is can be
                                            set or changed after creating the tournament.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <div className="text-base font-medium">Configuration</div>
                                <div className="text-sm text-muted-foreground">
                                    Additional settings for the tournament with sensible defaults.
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row w-full place-items-start justify-evenly sm:divide-x gap-4">
                                <FormField
                                    control={form.control}
                                    name="settings.rankingConfig.winPoints"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row sm:flex-col w-full space-y-1 place-items-center sm:place-items-start justify-stretch sm:justify-start">
                                            <FormLabel className="whitespace-nowrap">Win points</FormLabel>
                                            <div className="h-[2px] bg-accent flex-grow sm:hidden ml-4"></div>
                                            <CounterFormField field={field} />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="settings.rankingConfig.drawPoints"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row sm:flex-col w-full space-y-1 place-items-center sm:place-items-start justify-stretch sm:justify-start">
                                            <FormLabel className="whitespace-nowrap">Draw points</FormLabel>
                                            <div className="h-[2px] bg-accent flex-grow sm:hidden ml-4"></div>
                                            <CounterFormField field={field} />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="settings.rankingConfig.lossPoints"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row sm:flex-col w-full space-y-1 place-items-center sm:place-items-start justify-stretch sm:justify-start">
                                            <FormLabel className="whitespace-nowrap">Loss points</FormLabel>
                                            <div className="h-[2px] bg-accent flex-grow sm:hidden ml-4"></div>
                                            <CounterFormField field={field} />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="settings.rankingConfig.addScorePoints"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between">
                                        <div className="space-y-1">
                                            <FormLabel>Allow adding score points</FormLabel>
                                            <FormDescription>
                                                Add extra points to matches.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isCreating}>
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                onClick={async () => {
                                    await form.trigger();
                                    if (form.formState.isValid) {
                                        await form.handleSubmit(onSubmit)();
                                    }
                                }}
                                disabled={isCreating}
                            >
                                {isCreating
                                    ? <LoaderIcon className="animate-spin" />
                                    : "Create"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </form>
            </Form>
        </Dialog>
    );
}

/**
 * @param {{field: { onChange: (value: number) => void; value: number } }} param0
 */
function CounterFormField({ field }) {
    return (
        <div className="flex place-items-center justify-evenly gap-3">
            <Button
                variant="ghost"
                size="icon"
                disabled={field.value <= 0}
                onClick={() => {
                    if (field.value > 0) {
                        field.onChange(field.value - 1);
                    }
                }}
            >
                <MinusIcon />
            </Button>
            <span>{field.value}</span>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    field.onChange(field.value + 1);
                }}
            >
                <PlusIcon />
            </Button>
        </div>
    );
}
