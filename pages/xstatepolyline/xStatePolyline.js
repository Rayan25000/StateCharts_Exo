
import Konva from "konva";
import { createMachine, interpret } from "xstate";


const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

// Une couche pour le dessin
const dessin = new Konva.Layer();
// Une couche pour la polyline en cours de construction
const temporaire = new Konva.Layer();
stage.add(dessin);
stage.add(temporaire);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5gF8A0IB2B7CdGgAcsAbATwBkBLDMfEI2SgF0qwzoA9EBaANnVI9eAOgAM4iZMkB2ZGnokK1MMMoRitJAsYs2nRABYATAMQAOAIzCD0gJwXetgwGZezgw9ty5QA */
        id: "polyLine",
        initial: "idle",
        states: {
            idle: {
                on: {
                    MOUSECLICK: {
                        target: "onePoint",
                        actions: "createLine",
                    },
                },
            },
            onePoint: {
                on: {
                    MOUSECLICK: {
                        target: "manyPoints",
                        actions: "addPoint",
                    },
                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },
                    Escape: { // event.key
                        target: "idle",
                        actions: "abandon",
                    },
                },
            },
            manyPoints: {
                on: {
                    MOUSECLICK: [
                        {
                            actions: "addPoint",
                            cond: "pasPlein",
                        },
                        {
                            target: "idle",
                            actions: ["addPoint", "saveLine"],
                        },
                    ],

                    MOUSEMOVE: {
                        actions: "setLastPoint",
                    },

                    Escape: {
                        target: "idle",
                        actions: "abandon",
                    },

                    Enter: { // event.key
                        target: "idle",
                        actions: "saveLine",
                    },

                    Backspace: [ // event.key
                        {
                            target: "manyPoints",
                            actions: "removeLastPoint",
                            cond: "plusDeDeuxPoints",
                            internal: true,
                        },
                        {
                            target: "onePoint",
                            actions: "removeLastPoint",
                        },
                    ],
                },
            },
        },
    },
    {
        actions: {
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                temporaire.add(polyline);
            },
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                temporaire.batchDraw();
            },
            saveLine: (context, event) => {
                polyline.remove(); // On l'enlève de la couche temporaire
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                polyline.stroke("black"); // On change la couleur
                // On sauvegarde la polyline dans la couche de dessin
                dessin.add(polyline); // On l'ajoute à la couche de dessin
            },
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
            abandon: (context, event) => {
                polyline.remove();
            },
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                temporaire.batchDraw(); // Redraw the layer to reflect the changes
            },
        },
        guards: {
            pasPlein: (context, event) => {
                // On peut encore ajouter un point
                return polyline.points().length < MAX_POINTS * 2;
            },
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 6;
            },
        },
    }
);

const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();

stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    polylineService.send(event.key);
});
