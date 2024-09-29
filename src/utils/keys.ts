// bites:restarurent:data

export function getKeyName(...args:string[]) {
    return `restro:${args.join(":")}`;
}



