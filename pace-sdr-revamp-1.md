This is a high level planning session. Outlined goals will take multiple sessions, its okay to plan and delegate accordingly. Especially to batch or run parallel sessions to save context/tokens.

THIS SESSION IS A GOOD OPPORTUNITY TO OFFER ALTERNATIVE TOOLS, PLUGINS, SKILLS, THAT COULD MAKE THIS FASTER/MORE EFFICIENT. AGAIN- want to build with intent to reuse, not reinvent the wheel.

PLANNING OBJECTIVE: I'm introducing a seeder or rating aspect (calling it "sdr") to /PACE/. The project will require algorithm development, research on the underlying factors, and proper integrative support from our current back end, which will ultimately need to be updated.

PRIORITIES (flexible):
1. Updated backend architecture (and support documentation/plans) to properly support anticipated plans for the frontend of /pace/ and /sdr/. Want to start planning scrapes of this years outdoor season are ingesting correct variables so A) can work for sdr too B) data is properly unified (currently is not in live version of /pace/)  C) is ingesting some extra variables we'll need for sdr(dont wanna any backfills if possible)
1b. to do this effectively I need to nail down what metrics algorithm needs and have that specifically designed. I like the variables withing and their weights to be flexible for future testing but we need to know what numbers we're gonna wanna pull per athlete.
2. ensure /pace visualizer is error free, Before we build sdr, I want to make sure we’re starting from a clean point so we don’t have difficulties moving forward.
3. research materials collection for sdr's rating algorithm - split distribution models for different times, associated formulas, 
4. frontend redesign and UX improvements for /pace/
5. frontend design for /sdr/ will need to identify the needed pages for this though. ie leaderboard (filters for race(s), team/school, competition time/year, szn, gender, athlete yr, division (I,II,II, juco, naia)), athlete profile w/ racing fingerprint of splits (+other athlete specific data), import dashboard or custom group dashboard to build a group of select athletes for seeding, UI support toggles to let you modify which parts of the algorithm you're using for the rating, etc.)

100% need a session prompt that helps me develop the algorithm model out to something more coherent

