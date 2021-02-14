import { observable, observe, computed, runInAction } from "../mobx4"

test("observe object and map properties", function () {
    const map = observable.map({ a: 1 })
    const events: any[] = []

    expect(() => observe(map, "b", () => {})).toThrow(
        /the entry 'b' does not exist in the observable map/
    )

    const d1 = observe(map, "a", e => events.push([e.newValue, e.oldValue]))

    map.set("a", 2)
    map.set("a", 3)
    d1()
    map.set("a", 4)

    const o = observable({ a: 5 })

    expect(() => observe(o, "b" as any, () => {})).toThrow(
        /no observable property 'b' found on the observable object/
    )
    const d2 = observe(o, "a", e => events.push([e.newValue, e.oldValue]))

    o.a = 6
    o.a = 7
    d2()
    o.a = 8

    expect(events).toEqual([
        [2, 1],
        [3, 2],
        [6, 5],
        [7, 6]
    ])
})

test("observe computed values", () => {
    const events: any[] = []

    const v = observable.box(0)
    const f = observable.box(0)
    const c = computed(() => v.get())

    observe(c, e => {
        v.get()
        f.get()
        events.push([e.newValue, e.oldValue])
    })

    v.set(6)
    f.set(10)

    expect(events).toEqual([[6, 0]])
})

test("observe computed value (fireImmediately)", () => {
    const events: string[] = []

    const v = observable.box(0)
    const c = computed(() => v.get())

    c.observe_(e => {
        events.push(`observe ${e.oldValue} -> ${e.newValue}`)
    }, true)

    expect(events).toEqual(["observe undefined -> 0"])
})

test("observe computed value ignores transaction", () => {
    const events: string[] = []

    const v = observable.box(0)
    const c = computed(() => v.get())

    c.observe_(e => {
        events.push(`observe ${e.oldValue} -> ${e.newValue}`)
    })

    runInAction(() => {
        events.push("action start")
        v.set(1)
        v.set(2)
        events.push("action end")
    })

    expect(events).toEqual(["action start", "observe 0 -> 1", "observe 1 -> 2", "action end"])
})
