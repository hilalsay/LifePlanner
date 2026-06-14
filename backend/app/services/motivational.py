import random

LOCAL_MESSAGES = [
    "You didn't come this far to only come this far. Unless you did. In which case, impressive.",
    "Today's agenda: be slightly less chaotic than yesterday. Baby steps.",
    "Your future self is watching you. They look tired but proud.",
    "The only bad workout is the one that didn't happen. Same goes for your to-do list.",
    "You are a human being, not a human doing. But maybe do the thing anyway.",
    "Progress over perfection. Unless it's a souffle. Then perfection matters.",
    "Your brain called. It wants you to drink water and close some tabs.",
    "Crushing it today? No? That's fine too. Crushing it tomorrow then.",
    "You've survived 100% of your bad days so far. Excellent track record.",
    "Small steps taken consistently beat massive leaps taken never. Science.",
    "The secret to getting ahead is getting started. The secret to getting started is caffeine.",
    "Goals: written down. Plans: half-formed. Vibes: immaculate.",
    "Discipline is just motivation you remembered to automate.",
    "One day at a time. Unless it's a good day — then savour every minute.",
    "Your only competition is yesterday's you. Yesterday's you was also confused, for the record.",
    "You have survived every difficult day so far. Today's no different, just newer.",
    "The plan is: do the thing, feel good, repeat. Simple. Executable. Mostly.",
    "Hydrated people make better decisions. This is your water reminder.",
    "Somewhere in the world, someone is proud of you for trying. That someone is me.",
    "Future you will either thank present you or shake their head slowly. Choose wisely.",
]


def get_local_message() -> str:
    return random.choice(LOCAL_MESSAGES)
