## Table of Contents
- [Agentic Engineering Patterns](#page-1)
- [What is agentic engineering?](#page-2)
- [Writing code is cheap now](#page-3)
- [Hoard things you know how to do](#page-4)
- [AI should help us produce better code](#page-5)
- [Anti-patterns: things to avoid](#page-6)
- [How coding agents work](#page-7)
- [Using Git with coding agents](#page-8)
- [Subagents](#page-9)
- [Red/green TDD](#page-10)
- [First run the tests](#page-11)
- [Agentic manual testing](#page-12)
- [Linear walkthroughs](#page-13)
- [Interactive explanations](#page-14)
- [GIF optimization tool using WebAssembly and Gifsicle](#page-15)
- [Adding a new content type to my blog-to-newsletter tool](#page-16)
- [Prompts I use](#page-17)

---

<a id="page-1"></a>

# Agentic Engineering Patterns

## Agentic Engineering Patterns

Patterns for getting the best results out of coding agents like Claude Code and OpenAI Codex. See [my introduction](https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/) for more on this project.

1. **Principles**
    1.  [What is agentic engineering?](https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/)
        -   [Agentic engineering](https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/#agentic-engineering)
        -   [Isn't this just vibe coding?](https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/#isnt-this-just-vibe-coding)
        -   [About this guide](https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/#about-this-guide)
    2.  [Writing code is cheap now](https://simonwillison.net/guides/agentic-engineering-patterns/code-is-cheap/)
        -   [Good code still has a cost](https://simonwillison.net/guides/agentic-engineering-patterns/code-is-cheap/#good-code)
        -   [We need to build new habits](https://simonwillison.net/guides/agentic-engineering-patterns/code-is-cheap/#we-need-to-build-new-habits)
    3.  [Hoard things you know how to do](https://simonwillison.net/guides/agentic-engineering-patterns/hoard-things-you-know-how-to-do/)
        -   [Recombining things from your hoard](https://simonwillison.net/guides/agentic-engineering-patterns/hoard-things-you-know-how-to-do/#recombining-things-from-your-hoard)
        -   [Coding agents make this even more powerful](https://simonwillison.net/guides/agentic-engineering-patterns/hoard-things-you-know-how-to-do/#coding-agents-make-this-even-more-powerful)
    4.  [AI should help us produce better code](https://simonwillison.net/guides/agentic-engineering-patterns/better-code/)
        -   [Avoiding taking on technical debt](https://simonwillison.net/guides/agentic-engineering-patterns/better-code/#avoiding-taking-on-technical-debt)
        -   [Coding agents can handle these for us](https://simonwillison.net/guides/agentic-engineering-patterns/better-code/#coding-agents-can-handle-these-for-us)
        -   [AI tools let us consider more options](https://simonwillison.net/guides/agentic-engineering-patterns/better-code/#ai-tools-let-us-consider-more-options)
        -   [Embrace the compound engineering loop](https://simonwillison.net/guides/agentic-engineering-patterns/better-code/#embrace-the-compound-engineering-loop)
    5.  [Anti-patterns: things to avoid](https://simonwillison.net/guides/agentic-engineering-patterns/anti-patterns/)
        -   [Inflicting unreviewed code on collaborators](https://simonwillison.net/guides/agentic-engineering-patterns/anti-patterns/#inflicting-unreviewed-code-on-collaborators)
2. **Working with coding agents**
    1.  [How coding agents work](https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/)
        -   [Large Language Models](https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/#large-language-models)
        -   [Chat templated prompts](https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/#chat-templated-prompts)
        -   [Token caching](https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/#token-caching)
        -   [Calling tools](https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/#calling-tools)
        -   [The system prompt](https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/#the-system-prompt)
        -   [Reasoning](https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/#reasoning)
        -   [LLM + system prompt + tools in a loop](https://simonwillison.net/guides/agentic-engineering-patterns/how-coding-agents-work/#llm-system-prompt-tools-in-a-loop)
    2.  [Using Git with coding agents](https://simonwillison.net/guides/agentic-engineering-patterns/using-git-with-coding-agents/)
        -   [Git essentials](https://simonwillison.net/guides/agentic-engineering-patterns/using-git-with-coding-agents/#git-essentials)
        -   [Core concepts and prompts](https://simonwillison.net/guides/agentic-engineering-patterns/using-git-with-coding-agents/#core-concepts-and-prompts)
        -   [Rewriting history](https://simonwillison.net/guides/agentic-engineering-patterns/using-git-with-coding-agents/#rewriting-history)
    3.  [Subagents](https://simonwillison.net/guides/agentic-engineering-patterns/subagents/)
        -   [Claude Code’s Explore subagent](https://simonwillison.net/guides/agentic-engineering-patterns/subagents/#claude-codes-explore-subagent)
        -   [Parallel subagents](https://simonwillison.net/guides/agentic-engineering-patterns/subagents/#parallel-subagents)
        -   [Specialist subagents](https://simonwillison.net/guides/agentic-engineering-patterns/subagents/#specialist-subagents)
        -   [Official documentation](https://simonwillison.net/guides/agentic-engineering-patterns/subagents/#official-documentation)
3. **Testing and QA**
    1.  [Red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/)
    2.  [First run the tests](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/)
    3.  [Agentic manual testing](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/)
        -   [Mechanisms for agentic manual testing](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/#mechanisms-for-agentic-manual-testing)
        -   [Using browser automation for web UIs](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/#using-browser-automation-for-web-uis)
        -   [Have them take notes with Showboat](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/#have-them-take-notes-with-showboat)
4. **Understanding code**
    1.  [Linear walkthroughs](https://simonwillison.net/guides/agentic-engineering-patterns/linear-walkthroughs/)
        -   [An example using Showboat and Present](https://simonwillison.net/guides/agentic-engineering-patterns/linear-walkthroughs/#an-example-using-showboat-and-present)
    2.  [Interactive explanations](https://simonwillison.net/guides/agentic-engineering-patterns/interactive-explanations/)
        -   [Understanding word clouds](https://simonwillison.net/guides/agentic-engineering-patterns/interactive-explanations/#understanding-word-clouds)
5. **Annotated prompts**
    1.  [GIF optimization tool using WebAssembly and Gifsicle](https://simonwillison.net/guides/agentic-engineering-patterns/gif-optimization/)
        -   [The follow-up prompts](https://simonwillison.net/guides/agentic-engineering-patterns/gif-optimization/#the-follow-up-prompts)
    2.  [Adding a new content type to my blog-to-newsletter tool](https://simonwillison.net/guides/agentic-engineering-patterns/adding-a-new-content-type/)
6. **Appendix**
    1.  [Prompts I use](https://simonwillison.net/guides/agentic-engineering-patterns/prompts/)
        -   [Artifacts](https://simonwillison.net/guides/agentic-engineering-patterns/prompts/#artifacts)
        -   [Proofreader](https://simonwillison.net/guides/agentic-engineering-patterns/prompts/#proofreader)
        -   [Alt text](https://simonwillison.net/guides/agentic-engineering-patterns/prompts/#alt-text)
        -   [Podcast highlights](https://simonwillison.net/guides/agentic-engineering-patterns/prompts/#podcast-highlights)

---

<a id="page-2"></a>

# What is agentic engineering?

I use the term **agentic engineering** to describe the practice of developing software with the assistance of coding agents.

What are **coding agents**? They're agents that can both write and execute code. Popular examples include [Claude Code](https://code.claude.com/), [OpenAI Codex](https://openai.com/codex/), and [Gemini CLI](https://geminicli.com/).

What's an **agent**? Clearly defining that term is a challenge that has frustrated AI researchers since [at least the 1990s](https://simonwillison.net/2024/Oct/12/michael-wooldridge/) but the definition I've come to accept, at least in the field of Large Language Models (LLMs) like GPT-5 and Gemini and Claude, is this one:

**Agents run tools in a loop to achieve a goal**

The "agent" is software that calls an LLM with your prompt and passes it a set of tool definitions, then calls any tools that the LLM requests and feeds the results back into the LLM.

For coding agents, those tools include one that can execute code.

You prompt the coding agent to define a goal. The agent then generates and executes code in a loop until that goal has been met.

Code execution is the defining capability that makes agentic engineering possible. Without the ability to directly run the code, anything output by an LLM is of limited value. With code execution, these agents can start iterating towards software that demonstrably works.

## Agentic engineering

Now that we have software that can write working code, what is there left for us humans to do?

The answer is _so much stuff_.

Writing code has never been the sole activity of a software engineer. The craft has always been figuring out _what_ code to write. Any given software problem has dozens of potential solutions, each with their own tradeoffs. Our job is to navigate those options and find the ones that are the best fit for our unique set of circumstances and requirements.

Getting great results out of coding agents is a deep subject in its own right, especially now as the field continues to evolve at a bewildering rate.

We need to provide our coding agents with the tools they need to solve our problems, specify those problems in the right level of detail, and verify and iterate on the results until we are confident they address our problems in a robust and credible way.

LLMs don't learn from their past mistakes, but coding agents can, provided we deliberately update our instructions and tool harnesses to account for what we learn along the way.

Used effectively, coding agents can help us be much more ambitious with the projects we take on. Agentic engineering should help us produce more, better quality code that solves more impactful problems.

## Isn't this just vibe coding?

The term "vibe coding" was [coined by Andrej Karpathy](https://twitter.com/karpathy/status/1886192184808149383) in February 2025 - coincidentally just three weeks prior to the original release of Claude Code - to describe prompting LLMs to write code while you "forget that the code even exists".

Some people extend that definition to cover any time an LLM is used to produce code at all, but I think that's a mistake. Vibe coding is more useful in its original definition - we need a term to describe unreviewed, prototype-quality LLM-generated code that distinguishes it from code that the author has brought up to a production ready standard.

## About this guide

Just like the field it attempts to cover, _Agentic Engineering Patterns_ is very much a work in progress. My goal is to identify and describe patterns for working with these tools that demonstrably get results, and that are unlikely to become outdated as the tools advance.

I'll continue adding more chapters as new techniques emerge. No chapter should be considered finished. I'll be updating existing chapters as our understanding of these patterns evolves.

---

<a id="page-3"></a>

# Writing code is cheap now

The biggest challenge in adopting agentic engineering practices is getting comfortable with the consequences of the fact that _writing code is cheap now_.

Code has always been expensive. Producing a few hundred lines of clean, tested code takes most software developers a full day or more. Many of our engineering habits, at both the macro and micro level, are built around this core constraint.

At the macro level we spend a great deal of time designing, estimating and planning out projects, to ensure that our expensive coding time is spent as efficiently as possible. Product feature ideas are evaluated in terms of how much value they can provide _in exchange for that time_ - a feature needs to earn its development costs many times over to be worthwhile!

At the micro level we make hundreds of decisions a day predicated on available time and anticipated tradeoffs. Should I refactor that function to be slightly more elegant if it adds an extra hour of coding time? How about writing documentation? Is it worth adding a test for this edge case? Can I justify building a debug interface for this?

Coding agents dramatically drop the cost of typing code into the computer, which disrupts _so many_ of our existing personal and organizational intuitions about which trade-offs make sense.

The ability to run parallel agents makes this even harder to evaluate, since one human engineer can now be implementing, refactoring, testing and documenting code in multiple places at the same time.

## Good code still has a cost

Delivering new code has dropped in price to almost free... but delivering _good_ code remains significantly more expensive than that.

Here's what I mean by "good code":

- The code works. It does what it's meant to do, without bugs.
- We _know the code works_. We've taken steps to confirm to ourselves and to others that the code is fit for purpose.
- It solves the right problem.
- It handles error cases gracefully and predictably: it doesn't just consider the happy path. Errors should provide enough information to help future maintainers understand what went wrong.
- It’s simple and minimal - it does only what’s needed, in a way that both humans and machines can understand now and maintain in the future.
- It's protected by tests. The tests show that it works now and act as a regression suite to avoid it quietly breaking in the future.
- It's documented at an appropriate level, and that documentation reflects the current state of the system - if the code changes an existing behavior the existing documentation needs to be updated to match.
- The design affords future changes. It's important to maintain [YAGNI](https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it) - code with added complexity to anticipate future changes that may never come is often bad code - but it's also important not to write code that makes future changes much harder than they should be.
- All of the other relevant "ilities" - accessibility, testability, reliability, security, maintainability, observability, scalability, usability - the non-functional quality measures that are appropriate for the particular class of software being developed.

Coding agent tools can help with most of this, but there is still a substantial burden on the developer driving those tools to ensure that the produced code is good code for the subset of good that's needed for the current project.

## We need to build new habits

The challenge is to develop new personal and organizational habits that respond to the affordances and opportunities of agentic engineering.

These best practices are still being figured out across our industry. I'm still figuring them out myself.

For now I think the best we can do is to second guess ourselves: any time our instinct says "don't build that, it's not worth the time" fire off a prompt anyway, in an asynchronous agent session where the worst that can happen is you check ten minutes later and find that it wasn't worth the tokens.

---

<a id="page-4"></a>

# Hoard things you know how to do

Many of my tips for working productively with coding agents are extensions of advice I've found useful in my career without them. Here's a great example of that: **hoard things you know how to do**.

A big part of the skill in building software is understanding what's possible and what isn't, and having at least a rough idea of how those things can be accomplished.

These questions can be broad or quite obscure. Can a web page run OCR operations in JavaScript alone? Can an iPhone app pair with a Bluetooth device even when the app isn't running? Can we process a 100GB JSON file in Python without loading the entire thing into memory first?

The more answers to questions like this you have under your belt, the more likely you'll be able to spot opportunities to deploy technology to solve problems in ways other people may not have thought of yet.

The best way to be confident in answers to these questions is to have seen them illustrated by _running code_. Knowing that something is theoretically possible is not the same as having seen it done for yourself. A key asset to develop as a software professional is a deep collection of answers to questions like this, accompanied by proof of those answers.

I hoard solutions like this in a number of different ways. My [blog](https://simonwillison.net/) and [TIL blog](https://til.simonwillison.net/) are crammed with notes on things I've figured out how to do. I have [over a thousand GitHub repos](https://github.com/simonw) collecting code I've written for different projects, many of them small proof-of-concepts that demonstrate a key idea.

More recently I've used LLMs to help expand my collection of code solutions to interesting problems.

[tools.simonwillison.net](https://tools.simonwillison.net/) is my largest collection of LLM-assisted tools and prototypes. I use this to collect what I call [HTML tools](https://simonwillison.net/2025/Dec/10/html-tools/) - single HTML pages that embed JavaScript and CSS and solve a specific problem.

My [simonw/research](https://github.com/simonw/research) repository has larger, more complex examples where I’ve challenged a coding agent to research a problem and come back with working code and a written report detailing what it found out.

## Recombining things from your hoard

Why collect all of this stuff? Aside from helping you build and extend your own abilities, the assets you generate along the way become powerful inputs for your coding agents.

One of my favorite prompting patterns is to tell an agent to build something new by combining two or more existing working examples.

A project that helped crystallize how effective this can be was the first thing I added to my tools collection - a browser-based [OCR tool](https://tools.simonwillison.net/ocr), described [in more detail here](https://simonwillison.net/2024/Mar/30/ocr-pdfs-images/).

I wanted an easy, browser-based tool for OCRing pages from PDF files - in particular PDFs that consist entirely of scanned images with no text version provided at all.

I had previously experimented with running the [Tesseract.js OCR library](https://tesseract.projectnaptha.com/) in my browser, and found it to be very capable. That library provides a WebAssembly build of the mature Tesseract OCR engine and lets you call it from JavaScript to extract text from an image.

I didn’t want to work with images though, I wanted to work with PDFs. Then I remembered that I had also worked with Mozilla’s [PDF.js](https://mozilla.github.io/pdf.js/) library, which among other things can turn individual pages of a PDF into rendered images.

I had snippets of JavaScript for both of those libraries in my notes.

Here’s the full prompt I fed into a model (at the time it was Claude 3 Opus), combining my two examples and describing the solution I was looking for:

This worked flawlessly! The model kicked out a proof-of-concept page that did exactly what I needed.

I ended up [iterating with it a few times](https://gist.github.com/simonw/6a9f077bf8db616e44893a24ae1d36eb) to get to my final result, but it took just a few minutes to build a genuinely useful tool that I’ve benefited from ever since.

## Coding agents make this even more powerful

I built that OCR example back in March 2024, nearly a year before the first release of Claude Code. Coding agents have made hoarding working examples even more valuable.

If your coding agent has internet access you can tell it to do things like:

(I specified `curl` there because Claude Code defaults to using a WebFetch tool which summarizes the page content rather than returning the raw HTML.)

Coding agents are excellent at search, which means you can run them on your own machine and tell them where to find the examples of things you want them to do:

Often that's enough - the agent will fire up a search sub-agent to investigate and pull back just the details it needs to achieve the task.

Since so much of my research code is public I'll often tell coding agents to clone my repositories to `/tmp` and use them as input:

The key idea here is that coding agents mean we only ever need to figure out a useful trick _once_. If that trick is then documented somewhere with a working code example our agents can consult that example and use it to solve any similar shaped project in the future.

---

<a id="page-5"></a>

# AI should help us produce better code

Many developers worry that outsourcing their code to AI tools will result in a drop in quality, producing bad code that's churned out fast enough that decision makers are willing to overlook its flaws.

If adopting coding agents demonstrably reduces the quality of the code and features you are producing, you should address that problem directly: figure out which aspects of your process are hurting the quality of your output and fix them.

Shipping worse code with agents is a _choice_. We can choose to ship code [that is better](https://simonwillison.net/guides/agentic-engineering-patterns/code-is-cheap/#good-code) instead.

## Avoiding taking on technical debt

I like to think about shipping better code in terms of technical debt. We take on technical debt as the result of trade-offs: doing things "the right way" would take too long, so we work within the time constraints we are under and cross our fingers that our project will survive long enough to pay down the debt later on.

The best mitigation for technical debt is to avoid taking it on in the first place.

In my experience, a common category of technical debt fixes is changes that are simple but time-consuming.

- Our original API design doesn't cover an important case that emerged later on. Fixing that API would require changing code in dozens of different places, making it quicker to add a very slightly different new API and live with the duplication.
- We made a poor choice naming a concept early on - teams rather than groups for example - but cleaning up that nomenclature everywhere in the code is too much work so we only fix it in the UI.
- Our system has grown duplicate but slightly different functionality over time which needs combining and refactoring.
- One of our files has grown to several thousand lines of code which we would ideally split into separate modules.

All of these changes are conceptually simple but still need time dedicated to them, which can be hard to justify given more pressing issues.

## Coding agents can handle these for us

Refactoring tasks like this are an _ideal_ application of coding agents.

Fire up an agent, tell it what to change and leave it to churn away in a branch or worktree somewhere in the background.

I usually use asynchronous coding agents for this such as [Gemini Jules](https://jules.google.com/), [OpenAI Codex web](https://developers.openai.com/codex/cloud/), or [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web). That way I can run those refactoring jobs without interrupting my flow on my laptop.

Evaluate the result in a Pull Request. If it's good, land it. If it's almost there, prompt it and tell it what to do differently. If it's bad, throw it away.

The cost of these code improvements has dropped so low that we can afford a zero tolerance attitude to minor code smells and inconveniences.

## AI tools let us consider more options

Any software development task comes with a wealth of options for approaching the problem. Some of the most significant technical debt comes from making poor choices at the planning step - missing out on an obvious simple solution, or picking a technology that later turns out not to be exactly the right fit.

LLMs can help ensure we don't miss any obvious solutions that may not have crossed our radar before. They'll only suggest solutions that are common in their training data but those tend to be the [Boring Technology](https://boringtechnology.club/) that's most likely to work.

More importantly, coding agents can help with **exploratory prototyping**.

The best way to make confident technology choices is to prove that they are fit for purpose with a prototype.

Is Redis a good choice for the activity feed on a site which expects thousands of concurrent users?

The best way to know for sure is to wire up a simulation of that system and run a load test against it to see what breaks.

Coding agents can build this kind of simulation from a single well crafted prompt, which drops the cost of this kind of experiment to almost nothing. And since they're so cheap we can run multiple experiments at once, testing several solutions to pick the one that is the best fit for our problem.

## Embrace the compound engineering loop

Agents follow instructions. We can evolve these instructions over time to get better results from future runs, based on what we've learned previously.

Dan Shipper and Kieran Klaassen at Every describe their company's approach to working with coding agents as [Compound Engineering](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents). Every coding project they complete ends with a retrospective, which they call the **compound step** where they take what worked and document that for future agent runs.

If we want the best results from our agents, we should aim to continually increase the quality of our codebase over time. Small improvements compound. Quality enhancements that used to be time-consuming have now dropped in cost to the point that there's no excuse not to invest in quality at the same time as shipping new features. Coding agents mean we can finally have both.

---

<a id="page-6"></a>

# Anti-patterns: things to avoid

There are some behaviors that are anti-patterns in our weird new world of agentic engineering.

## Inflicting unreviewed code on collaborators

This anti-pattern is common and deeply frustrating.

**Don't file pull requests with code you haven't reviewed yourself**.

If you open a PR with hundreds (or thousands) of lines of code that an agent produced for you, and you haven't done the work to ensure that code is functional yourself, you are delegating the actual work to other people.

They could have prompted an agent themselves. What value are you even providing?

If you put code up for review you need to be confident that it's ready for other people to spend their time on it. The initial review pass is your responsibility, not something you should farm out to others.

A good agentic engineering pull request has the following characteristics:

- The code works, and you are confident that it works. [Your job is to deliver code that works](https://simonwillison.net/2025/Dec/18/code-proven-to-work/).
- The change is small enough to be reviewed efficiently without inflicting too much additional cognitive load on the reviewer. Several small PRs beats one big one, and splitting code into separate commits is easy with a coding agent to do the Git finagling for you.
- The PR includes additional context to help explain the change. What's the higher level goal that the change serves? Linking to relevant issues or specifications is useful here.
- Agents write convincing looking pull request descriptions. You need to review these too! It's rude to expect someone else to read text that you haven't read and validated yourself.

Given how easy it is to dump unreviewed code on other people, I recommend including some form of evidence that you've put that extra work in yourself. Notes on how you manually tested it, comments on specific implementation choices or even screenshots and video of the feature working go a _long_ way to demonstrating that a reviewer's time will not be wasted digging into the details.

---

<a id="page-7"></a>

# How coding agents work

As with any tool, understanding how [coding agents](https://simonwillison.net/guides/agentic-engineering-patterns/what-is-agentic-engineering/) work under the hood can help you make better decisions about how to apply them.

A coding agent is a piece of software that acts as a **harness** for an LLM, extending that LLM with additional capabilities that are powered by invisible prompts and implemented as callable tools.

## Large Language Models

At the heart of any coding agent is a Large Language Model, or LLM. These have names like GPT-5.4 or Claude Opus 4.6 or Gemini 3.1 Pro or Qwen3.5-35B-A3B.

An LLM is a machine learning model that can complete a sentence of text. Give the model the phrase "the cat sat on the " and it will (almost certainly) suggest "mat" as the next word in the sentence.

As these models get larger and train on increasing amounts of data, they can complete more complex sentences - like "a python function to download a file from a URL is def download\_file(url): ".

LLMs don't actually work directly with words - they work with tokens. A sequence of text is converted into a sequence of integer tokens, so "the cat sat on the " becomes `[3086, 9059, 10139, 402, 290, 220]`. This is worth understanding because LLM providers charge based on the number of tokens processed, and are limited in how many tokens they can consider at a time.

You can experiment with the OpenAI tokenizer to see how this works at [platform.openai.com/tokenizer](https://platform.openai.com/tokenizer).

The input to an LLM is called the **prompt**. The text returned by an LLM is called the **completion**, or sometimes the **response**.

Many models today are **multimodal**, which means they can accept more than just text as input. **Vision LLMs** (vLLMs) can accept images as part of the input, which means you can feed them sketches or photos or screenshots. A common misconception is that these are run through a separate process for OCR or image analysis, but these inputs are actually turned into yet more token integers which are processed in the same way as text.

## Chat templated prompts

The first LLMs worked as completion engines - users were expected to provide a prompt which could then be completed by the model, such as the two examples shown above.

This wasn't particularly user-friendly so models mostly switched to using **chat templated prompts** instead, which represent communication with the model as a simulated conversation.

This is actually just a form of completion prompt with a special format that looks something like this.

`user: write a python function to download a file from a URL assistant:`

The natural completion for this prompt is for the assistant (represented by the LLM) to answer the user's question with some Python code.

LLMs are stateless: every time they execute a prompt they start from the same blank slate.

To maintain the simulation of a conversation, the software that talks to the model needs to maintain its own state and replay the entire existing conversation every time the user enters a new chat prompt:

`user: write a python function to download a file from a URL assistant: def download_url(url):     return urllib.request.urlopen(url).read() user: use the requests library instead assistant:`

Since providers charge for both input and output tokens, this means that as a conversation gets longer, each prompt becomes more expensive since the number of input tokens grows every time.

## Token caching

Most model providers offset this somewhat through a cheaper rate for **cached input tokens** - common token prefixes that have been processed within a short time period can be charged at a lower rate as the underlying infrastructure can cache and then reuse many of the expensive calculations used to process that input.

Coding agents are designed with this optimization in mind - they avoid modifying earlier conversation content to ensure the cache is used as efficiently as possible.

## Calling tools

The defining feature of an LLM **agent** is that agents can call **tools**. But what is a tool?

A tool is a function that the agent harness makes available to the LLM.

At the level of the prompt itself, that looks something like this:

`system: If you need to access the weather, end your turn with <tool>get_weather(city_name)</tool> user: what's the weather in San Francisco? assistant:`

Here the assistant might respond with the following text:

`<tool>get_weather("San Francisco")</tool>`

The model harness software then extracts that function call request from the response - probably with a regular expression - and executes the tool.

It then returns the result to the model, with a constructed prompt that looks something like this:

`system: If you need to access the weather, end your turn with <tool>get_weather(city_name)</tool> user: what's the weather in San Francisco? assistant: <tool>get_weather("San Francisco")</tool> user: <tool-result>61°, Partly cloudy</tool-result> assistant:`

The LLM can now use that tool result to help generate an answer to the user's question.

Most coding agents define a dozen or more tools for the agent to call. The most powerful of these allow for code execution - a `Bash()` tool for executing terminal commands, or a `Python()` tool for running Python code, for example.

## The system prompt

In the previous example I included an initial message marked "system" which informed the LLM about the available tool and how to call it.

Coding agents usually start every conversation with a system prompt like this, which is not shown to the user but provides instructions telling the model how it should behave.

These system prompts can be hundreds of lines long. Here's [the system prompt for OpenAI Codex](https://github.com/openai/codex/blob/rust-v0.114.0/codex-rs/core/templates/model_instructions/gpt-5.2-codex_instructions_template.md) as-of March 2026, which is a useful clear example of the kind of instructions that make these coding agents work.

## Reasoning

One of the big new advances in 2025 was the introduction of **reasoning** to the frontier model families.

Reasoning, sometimes presented as **thinking** in the UI, is when a model spends additional time generating text that talks through the problem and its potential solutions before presenting a reply to the user.

This can look similar to a person thinking out loud, and has a similar effect. Crucially it allows models to spend more time (and more tokens) working on a problem in order to hopefully get a better result.

Reasoning is particularly useful for debugging issues in code as it gives the model an opportunity to navigate more complex code paths, mixing in tool calls and using the reasoning phase to follow function calls back to the potential source of an issue.

Many coding agents include options for dialing up or down the reasoning effort level, encouraging models to spend more time chewing on harder problems.

## LLM + system prompt + tools in a loop

Believe it or not, that's most of what it takes to build a coding agent!

If you want to develop a deeper understanding of how these things work, a useful exercise is to try building your own agent from scratch. A simple tool loop can be achieved with a few dozen lines of code on top of an existing LLM API.

A _good_ tool loop is a great deal more work than that, but the fundamental mechanics are surprisingly straightforward.

---

<a id="page-8"></a>

# Using Git with coding agents

Git is a key tool for working with coding agents. Keeping code in version control lets us record how that code changes over time and investigate and reverse any mistakes. All of the coding agents are fluent in using Git's features, both basic and advanced.

This fluency means we can be more ambitious about how we use Git ourselves. We don't need to memorize _how_ to do things with Git, but staying aware of what's possible means we can take advantage of the full suite of Git's abilities.

## Git essentials

Each Git project lives in a **repository** - a folder on disk that can track changes made to the files within it. Those changes are recorded in **commits** - timestamped bundles of changes to one or more files accompanied by a **commit message** describing those changes and an **author** recording who made them.

Git supports **branches**, which allow you to construct and experiment with new changes independently of each other. Branches can then be **merged** back into your main branch (using various methods) once they are deemed ready.

Git repositories can be **cloned** onto a new machine, and that clone includes both the current files and the full history of changes to them. This means developers - or coding agents - can browse and explore that history without any extra network traffic, making history diving effectively free.

Git repositories can live just on your own machine, but Git is designed to support collaboration and backups by publishing them to a **remote**, which can be public or private. GitHub is the most popular place for these remotes but Git is open source software that enables hosting these remotes on any machine or service that supports the Git protocol.

## Core concepts and prompts

Coding agents all have a deep understanding of Git jargon. The following prompts should work with any of them:

To turn the folder the agent is working in into a Git repository - the agent will probably run the `git init` command. If you just say "repo" agents will assume you mean a Git repository.

Create a new Git commit to record the changes the agent has made - usually with the `git commit -m "commit message"` command.

This should configure your repository for GitHub. You'll need to create a new repo first using [github.com/new](https://github.com/new), and configure your machine to talk to GitHub.

Or "recent changes" or "last three commits".

This is a great way to start a fresh coding agents session. Telling the agent to look at recent changes causes it to run `git log`, which can instantly load its context with details of what you have been working on recently - both the modified code and the commit messages that describe it.

Seeding the session in this way means you can start talking about that code - suggest additional fixes, ask questions about how it works, or propose the next change that builds on what came before.

Run this on your main branch to fetch other contributions from the remote repository, or run it in a branch to integrate the latest changes on main.

There are multiple ways to merge changes, including merge, rebase, squash or fast-forward. If you can't remember the details of these that's fine:

Agents are great at explaining the pros and cons of different merging strategies, and everything in git can always be undone so there's minimal risk in trying new things.

I use this universal prompt surprisingly often! Here's [a recent example](https://gisthost.github.io/?2aa2ee2fbd08d272528bbfc3b54a1a7d/page-001.html) where it fixed a cherry-pick for me that failed with a merge conflict.

There are plenty of ways you can get into a mess with Git, often through pulls or rebase commands that end in a merge conflict, or just through adding the wrong things to Git's staging environment.

Unpicking those used to be the most difficult and time consuming parts of working with Git. No more! Coding agents can navigate the most Byzantine of merge conflicts, reasoning through the intent of the new code and figuring out what to keep and how to combine conflicting changes. If your code has automated tests (and [it should](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/)) the agent can ensure those pass before finalizing that merge.

If you lose code that you are working on that's previously been committed (or saved with `git stash`) your agent can probably find it for you.

Git has a mechanism called the `reflog` which can often capture details of code that hasn't been committed to a permanent branch. Agents can search that, and search other branches too.

Just tell them what to find and watch them dive in.

Git bisect is one of the most powerful debugging tools in Git's arsenal, but it has a relatively steep learning curve that often deters developers from using it.

When you run a bisect operation you provide Git with some kind of test condition and a start and ending commit range. Git then runs a binary search to identify the earliest commit for which your test condition fails.

This can efficiently answer the question "what first caused this bug". The only downside is the need to express the test for the bug in a format that Git bisect can execute.

Coding agents can handle this boilerplate for you. This upgrades Git bisect from an occasional use tool to one you can deploy any time you are curious about the historic behavior of your software.

## Rewriting history

Let's get into the fun advanced stuff.

The commit history of a Git repository is not fixed. The data is just files on disk after all (tucked away in a hidden `.git/` directory), and Git itself provides tools that can be used to modify that history.

Don't think of the Git history as a permanent record of what actually happened - instead consider it to be a deliberately authored story that describes the progression of the software project.

This story is a tool to aid future development. Permanently recording mistakes and cancelled directions can sometimes be useful, but repository authors can make editorial decisions about what to keep and how best to capture that history.

Coding agents are really good at using Git's advanced history rewriting features.

### Undo or rewrite commits

It's common to commit code and then regret it - realize that it includes a file you didn't mean to include, for example. The git recipe for this is `git reset --soft HEAD~1`. I've never been able to remember that, and now I don't have to!

You can also perform more finely grained surgery on commits - rewriting them to remove just a single file, for example.

Agents can rewrite commit messages and can combine multiple commits into a single unit.

I've found that frontier models usually have really good taste in commit messages. I used to insist on writing these myself but I've accepted that the quality they produce is generally good enough, and often even better than what I would have produced myself.

### Building a new repository from scraps of an older one

A trick I find myself using quite often is extracting out code from a larger repository into a new one while maintaining the key history of that code.

One common example is library extraction. I may have built some classes and functions into a project and later realized they would make more sense as a standalone reusable code library.

This kind of operation used to be involved enough that most developers would create a fresh copy detached from that old commit history. We don't have to settle for that any more!

---

<a id="page-9"></a>

# Subagents

LLMs are restricted by their **context limit** - how many tokens they can fit in their working memory at any given time. These values have not increased much over the past two years even as the LLMs themselves have seen dramatic improvements in their abilities - they generally top out at around 1,000,000, and benchmarks frequently report better quality results below 200,000.

Carefully managing the context such that it fits within those limits is critical to getting great results out of a model.

**Subagents** provide a simple but effective way to handle larger tasks without burning through too much of the coding agent’s valuable top-level context.

When a coding agent uses a subagent it effectively dispatches a fresh copy of itself to achieve a specified goal, with a new context window that starts with a fresh prompt.

## Claude Code’s Explore subagent

Claude Code uses subagents extensively as part of its standard way of working. Let's use that as an illustrative example.

Any time you start a new task against an existing repo Claude Code first needs to explore that repo to figure out its general shape and find relevant information needed to achieve that task.

It does this by constructing a prompt and dispatching a subagent to perform that exploration and return a description of what it finds.

I kicked off a Claude Code session with a screenshot of [a page from my guide](https://simonwillison.net/guides/agentic-engineering-patterns/linear-walkthroughs/changes/) and this prompt:

> Make the chapter diffs also show which characters have changed in this diff view with a darker color of red or green for the individually changed segments of text within the line

Here's [the transcript](https://gisthost.github.io/?effbdc564939b88fe5c6299387e217da/index.html) of that session.

Claude Code started by running an “Explore” subagent with the following starter prompt:

> Find the code that implements the diff view for "chapters" in this Django blog. I need to find:
> 
> 1.  Templates that render diffs (look for diff-related HTML/CSS with red/green backgrounds)
> 2.  Python code that generates diffs (look for difflib usage or similar)
> 3.  Any JavaScript related to diff rendering
> 4.  CSS styles for the diff view (red/green line backgrounds)
> 
> Search thoroughly - check templates/, static/, blog/ directories. Look for keywords like "diff", "chapter", "revision", "history", "compare".

Subagents work similar to any other tool call: the parent agent dispatches them just as they would any other tool and waits for the response. It's interesting to see models prompt themselves in this way - they generally have good taste in prompting strategies.

The Explore subagent churned away for a few seconds and returned a response that started like this:

> Perfect! Now let me create a comprehensive summary with all the findings:
> 
> ### Summary: Chapter Diff View Implementation
> 
> I found the complete implementation of the diff view for chapters in this Django blog. Here are the key components:
> 
> #### 1\. **Python Code - Diff Generation** (`/home/user/simonwillisonblog/guides/views.py`, lines 139-202)
> 
> The `chapter_changes()` view function uses Python's built-in `difflib.unified_diff()` to generate diffs: \[…\]

The full subagent response included all of the details the parent agent needed in order to start editing the code to address my original request.

## Parallel subagents

This Explore subagent is the simplest example of how subagents can work, with the parent agent pausing while the subagent runs. The principle advantage of this kind of subagent is that it can work with a fresh context in a way that avoids spending tokens from the parent’s available limit.

Subagents can also provide a significant performance boost by having the parent agent run multiple subagents at the same time, potentially also using faster and cheaper models such as Claude Haiku to accelerate those tasks.

Coding agents that support subagents can use them based on your instructions. Try prompts like this:

`Use subagents to find and update all of the templates that are affected by this change.`

For tasks that involve editing several files - and where those files are not dependent on each other - this can offer a significant speed boost.

## Specialist subagents

Some coding agents allow subagents to run with further customizations, often in the form of a custom system prompt or custom tools or both, which allow those subagents to take on a different role.

These roles can cover a variety of useful specialties:

- A **code reviewer** agent can review code and identify bugs, feature gaps or weaknesses in the design.
- A **test runner** agent can run the test. This is particularly worthwhile if your test suite is large and verbose, as the subagent can hide the full test output from the main coding agent and report back with just details of any failures.
- A **debugger** agent can specialize in debugging problems, spending its token allowance reasoning though the codebase and running snippets of code to help isolate steps to reproduce and determine the root cause of a bug.

While it can be tempting to go overboard breaking up tasks across dozens of different specialist subagents, it's important to remember that the main value of subagents is in preserving that valuable root context and managing token-heavy operations. Your root coding agent is perfectly capable of debugging or reviewing its own output provided it has the tokens to spare.

## Official documentation

Several popular coding agents support subagents, each with their own documentation on how to use them:

- [OpenAI Codex subagents](https://developers.openai.com/codex/subagents/)
- [Claude subagents](https://code.claude.com/docs/en/sub-agents)
- [Gemini CLI subagents](https://geminicli.com/docs/core/subagents/)
- [Mistral Vibe subagents](https://docs.mistral.ai/mistral-vibe/agents-skills#agent-selection)
- [OpenCode agents](https://opencode.ai/docs/agents/)
- [Subagents in Visual Studio Code](https://code.visualstudio.com/docs/copilot/agents/subagents)
- [Cursor Subagents](https://cursor.com/docs/subagents)

---

<a id="page-10"></a>

# Red/green TDD

"**Use red/green TDD**" is a pleasingly succinct way to get better results out of a coding agent.

TDD stands for Test Driven Development. It's a programming style where you ensure every piece of code you write is accompanied by automated tests that demonstrate the code works.

The most disciplined form of TDD is test-first development. You write the automated tests first, confirm that they fail, then iterate on the implementation until the tests pass.

This turns out to be a _fantastic_ fit for coding agents. A significant risk with coding agents is that they might write code that doesn't work, or build code that is unnecessary and never gets used, or both.

Test-first development helps protect against both of these common mistakes, and also ensures a robust automated test suite that protects against future regressions. As projects grow the chance that a new change might break an existing feature grows with them. A comprehensive test suite is by far the most effective way to keep those features working.

It's important to confirm that the tests fail before implementing the code to make them pass. If you skip that step you risk building a test that passes already, hence failing to exercise and confirm your new implementation.

That's what "red/green" means: the red phase watches the tests fail, then the green phase confirms that they now pass.

Every good model understands "red/green TDD" as a shorthand for the much longer "use test driven development, write the tests first, confirm that the tests fail before you implement the change that gets them to pass".

Example prompt:

---

<a id="page-11"></a>

# First run the tests

Automated tests are no longer optional when working with coding agents.

The old excuses for not writing them - that they're time consuming and expensive to constantly rewrite while a codebase is rapidly evolving - no longer hold when an agent can knock them into shape in just a few minutes.

They're also _vital_ for ensuring AI-generated code does what it claims to do. If the code has never been executed it's pure luck if it actually works when deployed to production.

Tests are also a great tool to help get an agent up to speed with an existing codebase. Watch what happens when you ask Claude Code or similar about an existing feature - the chances are high that they'll find and read the relevant tests.

Agents are already biased towards testing, but the presence of an existing test suite will almost certainly push the agent into testing new changes that it makes.

Any time I start a new session with an agent against an existing project I'll start by prompting a variant of the following:

For my Python projects I have [pyproject.toml set up](https://til.simonwillison.net/uv/dependency-groups) such that I can prompt this instead:

These four word prompts serve several purposes:

1. It tells the agent that there is a test suite and forces it to figure out how to run the tests. This makes it almost certain that the agent will run the tests in the future to ensure it didn't break anything.
2. Most test harnesses will give the agent a rough indication of how many tests they are. This can act as a proxy for how large and complex the project is, and also hints that the agent should search the tests themselves if they want to learn more.
3. It puts the agent in a testing mindset. Having run the tests it's natural for it to then expand them with its own tests later on.

Similar to ["Use red/green TDD"](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/), "First run the tests" provides a four word prompt that encompasses a substantial amount of software engineering discipline that's already baked into the models.

---

<a id="page-12"></a>

# Agentic manual testing

The defining characteristic of a coding agent is that it can _execute the code_ that it writes. This is what makes coding agents so much more useful than LLMs that simply spit out code without any way to verify it.

Never assume that code generated by an LLM works until that code has been executed.

Coding agents have the ability to confirm that the code they have produced works as intended, or iterate further on that code until it does.

Getting agents to [write unit tests](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/), especially using test-first TDD, is a powerful way to ensure they have exercised the code they are writing.

That's not the only worthwhile approach, though.

Just because code passes tests doesn't mean it works as intended. Anyone who's worked with automated tests will have seen cases where the tests all pass but the code itself fails in some obvious way - it might crash the server on startup, fail to display a crucial UI element, or miss some detail that the tests failed to cover.

Automated tests are no replacement for **manual testing**. I like to see a feature working with my own eye before I land it in a release.

I've found that getting agents to manually test code is valuable as well, frequently revealing issues that weren't spotted by the automated tests.

## Mechanisms for agentic manual testing

How an agent should "manually" test a piece of code varies depending on what that code is.

For Python libraries a useful pattern is `python -c "... code ..."`. You can pass a string (or multiline string) of Python code directly to the Python interpreter, including code that imports other modules.

The coding agents are all familiar with this trick and will sometimes use it without prompting. Reminding them to test using `python -c` can often be effective though:

Other languages may have similar mechanisms, and if they don't it's still quick for an agent to write out a demo file and then compile and run it. I sometimes encourage it to use `/tmp` purely to avoid those files being accidentally committed to the repository later on.

Many of my projects involve building web applications with JSON APIs. For these I tell the agent to exercise them using `curl`:

Telling an agent to "explore" often results in it trying out a bunch of different aspects of a new API, which can quickly cover a whole lot of ground.

If an agent finds something that doesn't work through their manual testing, I like to tell them to fix it with red/green TDD. This ensures the new case ends up covered by the permanent automated tests.

## Using browser automation for web UIs

Having a manual testing procedure in place becomes even more valuable if a project involves an interactive web UI.

Historically these have been difficult to test from code, but the past decade has seen notable improvements in systems for automating real web browsers. Running a real Chrome or Firefox or Safari browser against an application can uncover all sorts of interesting problems in a realistic setting.

Coding agents know how to use these tools extremely well.

The most powerful of these today is **[Playwright](https://playwright.dev/)**, an open source library developed by Microsoft. Playwright offers a full-featured API with bindings in multiple popular programming languages and can automate any of the popular browser engines.

Simply telling your agent to "test that with Playwright" may be enough. The agent can then select the language binding that makes the most sense, or use Playwright's [playwright-cli](https://github.com/microsoft/playwright-cli) tool.

Coding agents work really well with dedicated CLIs. [agent-browser](https://github.com/vercel-labs/agent-browser) by Vercel is a comprehensive CLI wrapper around Playwright specially designed for coding agents to use.

My own project [Rodney](https://github.com/simonw/rodney) serves a similar purpose, albeit using the Chrome DevTools Protocol to directly control an instance of Chrome.

Here's an example prompt I use to test things with Rodney:

There are three tricks in this prompt:

- Saying "use `uvx rodney --help`" causes the agent to run `rodney --help` via the [uvx](https://docs.astral.sh/uv/guides/tools/) package management tool, which automatically installs Rodney the first time it is called.
- The `rodney --help` command is specifically designed to give agents everything they need to know to both understand and use the tool. Here's [that help text](https://github.com/simonw/rodney/blob/main/help.txt).
- Saying "look at screenshots" hints to the agent that it should use the `rodney screenshot` command and reminds it that it can use its own vision abilities against the resulting image files to evaluate the visual appearance of the page.

That's a whole lot of manual testing baked into a short prompt!

Rodney and tools like it offer a wide array of capabilities, from running JavaScript on the loaded site to scrolling, clicking, typing, and even reading the accessibility tree of the page.

As with other forms of manual tests, issues found and fixed via browser automation can then be added to permanent automated tests as well.

Many developers have avoided too many automated browser tests in the past due to their reputation for flakiness - the smallest tweak to the HTML of a page can result in frustrating waves of test breaks.

Having coding agents maintain those tests over time greatly reduces the friction involved in keeping them up-to-date in the face of design changes to the web interfaces.

## Have them take notes with Showboat

Having agents manually test code can catch extra problems, but it can also be used to create artifacts that can help document the code and demonstrate how it has been tested.

I'm fascinated by the challenge of having agents _show their work_. Being able to see demos or documented experiments is a really useful way of confirming that the agent has comprehensively solved the challenge it was given.

I built [Showboat](https://github.com/simonw/showboat) to facilitate building documents that capture the agentic manual testing flow.

Here's a prompt I frequently use:

As with Rodney above, the `showboat --help` command teaches the agent what Showboat is and how to use it. Here's [that help text in full](https://github.com/simonw/showboat/blob/main/help.txt).

The three key Showboat commands are `note`, `exec`, and `image`.

`note` appends a Markdown note to the Showboat document. `exec` records a command, then runs that command and records its output. `image` adds an image to the document - useful for screenshots of web applications taken using Rodney.

The `exec` command is the most important of these, because it captures a command along with the resulting output. This shows you what the agent did and what the result was, and is designed to discourage the agent from cheating and writing what it _hoped_ had happened into the document.

I've been finding the Showboat pattern to work really well for documenting the work that has been achieved during my agent sessions. I'm hoping to see similar patterns adopted across a wider set of tools.

---

<a id="page-13"></a>

# Linear walkthroughs

Sometimes it's useful to have a coding agent give you a structured walkthrough of a codebase.

Maybe it's existing code you need to get up to speed on, maybe it's your own code that you've forgotten the details of, or maybe you vibe coded the whole thing and need to understand how it actually works.

Frontier models with the right agent harness can construct a detailed walkthrough to help you understand how code works.

## An example using Showboat and Present

I recently [vibe coded a SwiftUI slide presentation app](https://simonwillison.net/2026/Feb/25/present/) on my Mac using Claude Code and Opus 4.6.

I was speaking about the advances in frontier models between November 2025 and February 2026, and I like to include at least one gimmick in my talks (a [STAR moment](https://simonwillison.net/2019/Dec/10/better-presentations/) - Something They'll Always Remember). In this case I decided the gimmick would be revealing at the end of the presentation that the slide mechanism itself was an example of what vibe coding could do.

I released the code [to GitHub](https://github.com/simonw/present) and then realized I didn't know anything about how it actually worked - I had prompted the whole thing into existence ([partial transcript here](https://gisthost.github.io/?bfbc338977ceb71e298e4d4d5ac7d63c)) without paying any attention to the code it was writing.

So I fired up a new instance of Claude Code for web, pointed it at my repo and prompted:

[Showboat](https://github.com/simonw/showboat) is a tool I built to help coding agents write documents that demonstrate their work. You can see the [showboat --help output here](https://github.com/simonw/showboat/blob/main/help.txt), which is designed to give the model everything it needs to know in order to use the tool.

The `showboat note` command adds Markdown to the document. The `showboat exec` command accepts a shell command, executes it and then adds both the command and its output to the document.

By telling it to use "sed or grep or cat or whatever you need to include snippets of code you are talking about" I ensured that Claude Code would not manually copy snippets of code into the document, since that could introduce a risk of hallucinations or mistakes.

This worked extremely well. Here's the [document Claude Code created with Showboat](https://github.com/simonw/present/blob/main/walkthrough.md), which talks through all six `.swift` files in detail and provides a clear and actionable explanation about how the code works.

I learned a great deal about how SwiftUI apps are structured and absorbed some solid details about the Swift language itself just from reading this document.

If you are concerned that LLMs might reduce the speed at which you learn new skills I strongly recommend adopting patterns like this one. Even a ~40 minute vibe coded toy project can become an opportunity to explore new ecosystems and pick up some interesting new tricks.

---

<a id="page-14"></a>

# Interactive explanations

When we lose track of how code written by our agents works we take on **cognitive debt**.

For a lot of things this doesn't matter: if the code fetches some data from a database and outputs it as JSON the implementation details are likely simple enough that we don't need to care. We can try out the new feature and make a very solid guess at how it works, then glance over the code to be sure.

Often though the details really do matter. If the core of our application becomes a black box that we don't fully understand we can no longer confidently reason about it, which makes planning new features harder and eventually slows our progress in the same way that accumulated technical debt does.

How do we pay down cognitive debt? By improving our understanding of how the code works.

One of my favorite ways to do that is by building **interactive explanations**.

## Understanding word clouds

In [An AI agent coding skeptic tries AI agent coding, in excessive detail](https://minimaxir.com/2026/02/ai-agent-coding/) Max Woolf mentioned testing LLMs' Rust abilities with the prompt `Create a Rust app that can create "word cloud" data visualizations given a long input text`.

This captured my imagination: I've always wanted to know how word clouds work, so I fired off an [asynchronous research project](https://simonwillison.net/2025/Nov/6/async-code-research/) - [initial prompt here](https://github.com/simonw/research/pull/91#issue-4002426963), [code and report here](https://github.com/simonw/research/tree/main/rust-wordcloud) - to explore the idea.

This worked really well: Claude Code for web built me a Rust CLI tool that could produce images like this one:

![A word cloud, many words, different colors and sizes, larger words in the middle.](https://raw.githubusercontent.com/simonw/research/refs/heads/main/rust-wordcloud/wordcloud.png)

But how does it actually work?

Claude's report said it uses "**Archimedean spiral placement** with per-word random angular offset for natural-looking layouts". This did not help me much!

I requested a [linear walkthrough](https://simonwillison.net/guides/agentic-engineering-patterns/linear-walkthroughs/) of the codebase which helped me understand the Rust code in more detail - here's [that walkthrough](https://github.com/simonw/research/blob/main/rust-wordcloud/walkthrough.md) (and [the prompt](https://github.com/simonw/research/commit/2cb8c62477173ef6a4c2e274be9f712734df6126)). This helped me understand the structure of the Rust code but I still didn't have an intuitive understanding of how that "Archimedean spiral placement" part actually worked.

So I asked for an **animated explanation**. I did this by pasting a link to that existing `walkthrough.md` document into a Claude Code session along with the following:

You can [play with the result here](https://tools.simonwillison.net/animated-word-cloud). Here's an animated GIF demo:

![Words appear on the word cloud one at a time, with little boxes showing where the algorithm is attempting to place them - if those boxes overlap an existing word it tries again.](https://static.simonwillison.net/static/2026/animated-word-cloud-demo.gif)

This was using Claude Opus 4.6, which turns out to have quite good taste when it comes to building explanatory animations.

If you watch the animation closely you can see that for each word it attempts to place it somewhere on the page by showing a box, run checks if that box intersects an existing word. If so it continues to try to find a good spot, moving outward in a spiral from the center.

I found that this animation really helped make the way the algorithm worked click for me.

I have long been a fan of animations and interactive interfaces to help explain different concepts. A good coding agent can produce these on demand to help explain code - its own code or code written by others.

---

<a id="page-15"></a>

# GIF optimization tool using WebAssembly and Gifsicle

I like to include animated GIF demos in my online writing, often recorded using [LICEcap](https://www.cockos.com/licecap/). There's an example in the [Interactive explanations](https://simonwillison.net/guides/agentic-engineering-patterns/interactive-explanations/) chapter.

These GIFs can be pretty big. I've tried a few tools for optimizing GIF file size and my favorite is [Gifsicle](https://github.com/kohler/gifsicle) by Eddie Kohler. It compresses GIFs by identifying regions of frames that have not changed and storing only the differences, and can optionally reduce the GIF color palette or apply visible lossy compression for greater size reductions.

Gifsicle is written in C and the default interface is a command line tool. I wanted a web interface so I could access it in my browser and visually preview and compare the different settings.

I prompted Claude Code for web (from my iPhone using the Claude iPhone app) against my [simonw/tools](https://github.com/simonw/tools) repo with the following:

Here's [what it built](https://tools.simonwillison.net/gif-optimizer), plus an animated GIF demo that I optimized using the tool:

![Animation. I drop on a GIF and the tool updates the page with a series of optimized versions under different settings. I eventually select Tweak settings on one of them, scroll to the bottom, adjust some sliders and download the result.](https://static.simonwillison.net/static/2026/demo2-32-colors-lossy.gif)

Let's address that prompt piece by piece.

> `gif-optimizer.html`

The first line simply tells it the name of the file I want to create. Just a filename is enough here - I know that when Claude runs "ls" on the repo it will understand that every file is a different tool.

My [simonw/tools](https://github.com/simonw/tools) repo currently lacks a `CLAUDE.md` or `AGENTS.md` file. I've found that agents pick up enough of the gist of the repo just from scanning the existing file tree and looking at relevant code in existing files.

> `Compile gifsicle to WASM, then build a web page that lets you open or drag-drop an animated GIF onto it and it then shows you that GIF compressed using gifsicle with a number of different settings, each preview with the size and a download button`

I'm making a bunch of assumptions here about Claude's existing knowledge, all of which paid off.

Gifsicle is nearly 30 years old now and is a widely used piece of software - I was confident that referring to it by name would be enough for Claude to find the code.

"`Compile gifsicle to WASM`" is doing a _lot_ of work here.

WASM is short for [WebAssembly](https://webassembly.org/), the technology that lets browsers run compiled code safely in a sandbox.

Compiling a project like Gifsicle to WASM is not a trivial operation, involving a complex toolchain usually involving the [Emscripten](https://emscripten.org/) project. It often requires a lot of trial and error to get everything working.

Coding agents are fantastic at trial and error! They can often brute force their way to a solution where I would have given up after the fifth inscrutable compiler error.

I've seen Claude Code figure out WASM builds many times before, so I was quite confident this would work.

"`then build a web page that lets you open or drag-drop an animated GIF onto it`" describes a pattern I've used in a lot of my other tools.

HTML file uploads work fine for selecting files, but a nicer UI, especially on desktop, is to allow users to drag and drop files into a prominent drop zone on a page.

Setting this up involves a bit of JavaScript to process the events and some CSS for the drop zone. It's not complicated but it's enough extra work that I might not normally add it myself. With a prompt it's almost free.

Here's the resulting UI - which was influenced by Claude taking a peek at my existing [image-resize-quality](https://tools.simonwillison.net/image-resize-quality) tool:

![Screenshot of a web application titled "GIF Optimizer" with subtitle "Powered by gifsicle compiled to WebAssembly — all processing happens in your browser". A large dashed-border drop zone reads "Drop an animated GIF here or click to select". Below is a text input with placeholder "Or paste a GIF URL..." and a blue "Load URL" button. Footer text reads "Built with gifsicle by Eddie Kohler, compiled to WebAssembly. gifsicle is released under the GNU General Public License, version 2."](https://static.simonwillison.net/static/2026/gif-optimizer.jpg)

I didn't ask for the GIF URL input and I'm not keen on it, because it only works against URLs to GIFs that are served with open CORS headers. I'll probably remove that in a future update.

"`then shows you that GIF compressed using gifsicle with a number of different settings, each preview with the size and a download button`" describes the key feature of the application.

I didn't bother defining the collection of settings I wanted - in my experience Claude has good enough taste at picking those for me, and we can always change them if its first guesses don't work.

Showing the size is important since this is all about optimizing for size.

I know from past experience that asking for a "download button" gets a button with the right HTML and JavaScript mechanisms set up such that clicking it provides a file save dialog, which is a nice convenience over needing to right-click-save-as.

> `Also include controls for the gifsicle options for manual use - each preview has a “tweak these settings” link which sets those manual settings to the ones used for that preview so the user can customize them further`

This is a pretty clumsy prompt - I was typing it in my phone after all - but it expressed my intention well enough for Claude to build what I wanted.

Here's what that looks like in the resulting tool, this screenshot showing the mobile version. Each image has a "Tweak these settings" button which, when clicked, updates this set of manual settings and sliders:

![Screenshot of a GIF Optimizer results and settings panel. At top, results show "110.4 KB (original: 274.0 KB) — 59.7% smaller" in green, with a blue "Download" button and a "Tweak these settings" button. Below is a "Manual Settings" card containing: "Optimization level" dropdown set to "-O3 (aggressive)", "Lossy (0 = off, higher = more loss)" slider set to 0, "Colors (0 = unchanged)" slider set to 0, "Color reduction method" dropdown set to "Default", "Scale (%)" slider set to 100%, "Dither" dropdown set to "Default", and a blue "Optimize with these settings" button.](https://static.simonwillison.net/static/2026/gif-optimizer-tweak.jpg)

> `Run “uvx rodney --help” and use that tool to tray your work - use this GIF for testing https://static.simonwillison.net/static/2026/animated-word-cloud-demo.gif`

Coding agents work _so much better_ if you make sure they have the ability to test their code while they are working.

There are many different ways to test a web interface - [Playwright](https://playwright.dev/) and [Selenium](https://www.selenium.dev/) and [agent-browser](https://agent-browser.dev/) are three solid options.

[Rodney](https://github.com/simonw/rodney) is a browser automation tool I built myself, which is quick to install and has `--help` output that's designed to teach an agent everything it needs to know to use the tool.

This worked great - in [the session transcript](https://claude.ai/code/session_01C8JpE3yQpwHfBCFni4ZUc4) you can see Claude using Rodney and fixing some minor bugs that it spotted, for example:

> The CSS `display: none` is winning over the inline style reset. I need to set `display: 'block'` explicitly.

## The follow-up prompts

When I'm working with Claude Code I usually keep an eye on what it's doing so I can redirect it while it's still in flight. I also often come up with new ideas while it's working which I then inject into the queue.

> `Include the build script and diff against original gifsicle code in the commit in an appropriate subdirectory`
> 
> `The build script should clone the gifsicle repo to /tmp and switch to a known commit before applying the diff - so no copy of gifsicle in the commit but all the scripts needed to build the wqsm`

I added this when I noticed it was putting a _lot_ of effort into figuring out how to get Gifsicle working with WebAssembly, including patching the original source code. Here's [the patch](https://github.com/simonw/tools/blob/main/lib/gifsicle/gifsicle-wasm.patch) and [the build script](https://github.com/simonw/tools/blob/main/lib/gifsicle/build.sh) it added to the repo.

I knew there was a pattern in that repo already for where supporting files lived but I couldn't remember what that pattern was. Saying "in an appropriate subdirectory" was enough for Claude to figure out where to put it - it found and used the existing [lib/ directory](https://github.com/simonw/tools/tree/main/lib).

> `You should include the wasm bundle`

This probably wasn't necessary, but I wanted to make absolutely sure that the compiled WASM file (which turned out [to be 233KB](https://github.com/simonw/tools/blob/main/lib/gifsicle/gifsicle.wasm)) was committed to the repo. I serve `simonw/tools` via GitHub Pages at [tools.simonwillison.net](https://tools.simonwillison.net/) and I wanted it to work without needing to be built locally.

> `Make sure the HTML page credits gifsicle and links to the repo`

This is just polite! I often build WebAssembly wrappers around other people's open source projects and I like to make sure they get credit in the resulting page.

Claude added this to the footer of the tool:

> Built with [gifsicle](https://github.com/kohler/gifsicle) by Eddie Kohler, compiled to WebAssembly. gifsicle is released under the GNU General Public License, version 2.

---

<a id="page-16"></a>

# Adding a new content type to my blog-to-newsletter tool

Here's an example of a deceptively short prompt that got a quite a lot of work done in a single shot.

First, some background. I send out a [free Substack newsletter](https://simonw.substack.com/) around once a week containing content copied-and-pasted from my blog. I'm effectively using Substack as a lightweight way to allow people to subscribe to my blog via email.

I generate the newsletter with my [blog-to-newsletter](https://tools.simonwillison.net/blog-to-newsletter) tool - an HTML and JavaScript app that fetches my latest content from [this Datasette instance](https://datasette.simonwillison.net/) and formats it as rich text HTML, which I can then copy to my clipboard and paste into the Substack editor. Here's a [detailed explanation of how that works](https://simonwillison.net/2023/Apr/4/substack-observable/).

I recently [added a new type of content](https://simonwillison.net/2026/Feb/20/beats/) to my blog to capture content that I post elsewhere, which I called "beats". These include things like releases of my open source projects, new tools that I've built, museums that I've visited (from [niche-museums.com](https://www.niche-museums.com/)) and other external content.

I wanted to include these in the generated newsletter. Here's the prompt I ran against the [simonw/tools](https://github.com/simonw/tools) repository that hosts my `blog-to-newsletter` tool, using [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web).

This got me the [exact solution](https://github.com/simonw/tools/pull/268) I needed. Let's break down the prompt.

> `Clone simonw/simonwillisonblog from github to /tmp for reference`

I use this pattern a lot. Coding agents can clone code from GitHub, and the best way to explain a problem is often to have them look at relevant code. By telling them to clone to `/tmp` I ensure they don't accidentally end up including that reference code in their own commit later on.

The [simonw/simonwillisonblog](https://github.com/simonw/simonwillisonblog) repository contains the source code for my Django-powered [simonwillison.net](https://simonwillison.net/) blog. This includes the logic and database schema for my new "beats" feature.

> `Update blog-to-newsletter.html to include beats that have descriptions - similar to how the Atom everything feed on the blog works`

Referencing `blog-to-newsletter.html` is all I need here to tell Claude which of the 200+ HTML apps in that `simonw/tools` repo it should be modifying.

Beats are automatically imported from multiple sources. Often they aren't very interesting - a dot-release bug fix for one of my smaller open source projects, for example.

My blog includes a way for me to add additional descriptions to any beat, which provides extra commentary but also marks that beat as being more interesting than those that I haven't annotated in some way.

I already use this as a distinction to decide which beats end up in my site's [Atom feed](https://simonwillison.net/about/#atom). Telling Claude to imitate that saves me from having to describe the logic in any extra detail.

> ``Run it with python -m http.server and use `uvx rodney --help` to test it - compare what shows up in the newsletter with what's on the homepage of https://simonwillison.net``

Coding agents always work best if they have some kind of validation mechanism they can use to test their own work.

In this case I wanted Claude Code to actively check that the changes it made to my tool would correctly fetch and display the latest data.

I reminded it to use `python -m http.server` as a static server because I've had issues in the past with applications that fetch data and break when served as a file from disk instead of a localhost server. In this particular case that may not have been necessary, but my prompting muscle memory has `python -m http.server` baked in at this point!

I described the `uvx rodney --help` trick in [the agentic manual testing chapter](https://simonwillison.net/guides/agentic-engineering-patterns/agentic-manual-testing/#using-browser-automation-for-web-uis). Rodney is browser automation software that can be installed using `uvx`, and that has `--help` output designed to teach an agent everything it needs to know in order to use the tool.

I figured that telling Claude to compare the results in the newsletter to the content of my blog's homepage would be enough for it to confidently verify that the new changes were working correctly, since I had recently posted content that matched the new requirements.

You can see [the full session here](https://claude.ai/code/session_01BibYBuvJi2qNUyCYGaY3Ss), or if that doesn't work I have an [alternative transcript](https://gisthost.github.io/?e906e938100ab42f4d6a932505219324/page-001.html#msg-2026-04-18T00-13-57-081Z) showing all of the individual tool calls.

The [resulting PR](https://github.com/simonw/tools/pull/268) made exactly the right change. It added an additional UNION clause to the SQL query that fetched the blog's content, filtering out draft beats and beats that have nothing in their `note` column:

`... union all select   id,   'beat' as type,   title,   created,   slug,   'No HTML' as html,   json_object(     'created', date(created),     'beat_type', beat_type,     'title', title,     'url', url,     'commentary', commentary,     'note', note   ) as json,   url as external_url from blog_beat where coalesce(note, '') != '' and is_draft = 0 union all ...`

And it figured out a mapping of beat types to their formal names, presumably derived from the [Django ORM definition](https://github.com/simonw/simonwillisonblog/blob/2e9d7ebe64da799b3927e61b4f85d98f7e9bc9aa/blog/models.py#L545-L551) that it read while it was exploring the reference codebase:

`const beatTypeDisplay = {   release: 'Release',   til: 'TIL',   til_update: 'TIL updated',   research: 'Research',   tool: 'Tool',   museum: 'Museum' };`

Telling agents to use another codebase as reference is a powerful shortcut for communicating complex concepts with minimal additional information needed in the prompt.

---

<a id="page-17"></a>

# Prompts I use

This section of the guide will be continually updated with prompts that I use myself, linked to from other chapters where appropriate.

## Artifacts

I frequently use Claude's Artifacts feature for prototyping and to build small HTML tools. Artifacts are when regular Claude chat builds an application in HTML and JavaScript and displays it directly within the Claude chat interface. OpenAI and Gemini offer a finial feature which they both call Canvas.

Models love using React for these. I don't like how React requires an additional build step which prevents me from copying and pasting code out of an artifact and into static hosting elsewhere, so I create my artifacts in Claude using a project with the following custom instructions:

## Proofreader

I don't let LLMs write text for my blog. My hard line is that anything that expresses opinions or uses "I" pronouns needs to have been written by me. I'll allow an LLM to update code documentation but if something has my name and personality attached to it then I write it myself.

I do use LLMs to proofread text that I publish. Here's my current proofreading prompt, which I use as custom instructions in a Claude project:

## Alt text

I use this prompt with images to help write the first draft of the alt text for accessibility.

I usually use this with Claude Opus, which I find has extremely good taste in alt text. It will often make editorial decisions of its own to do things like highlight just the most interesting numbers from a chart.

These decisions may not always be the right ones. Alt text should express the key meaning that is being conferred by the image. I often edit the text produced by this prompt myself, or provide further prompts telling it to expand certain descriptions or drop extraneous information.

Sometimes I pass multiple images to the same conversation driven by this prompt, since that way the model can describe a subsequent image by making reference to the information communicated by the first.

## Podcast highlights

After I'm a [guest on a podcast](https://simonwillison.net/tags/podcast-appearances/) I like to publish a blog post with some quoted highlights from the conversation. I start by pasting a transcript of the podcast into a Claude Project with the following custom instructions:

Here's [example output](https://claude.ai/share/713e7c9a-66cb-4c24-a9e2-028ad96ec23b) after pasting in the transcript from [An AI state of the union: We've passed the inflection point, dark factories are coming, and automation timelines](https://www.lennysnewsletter.com/p/an-ai-state-of-the-union) with Lenny Rachitsky.
