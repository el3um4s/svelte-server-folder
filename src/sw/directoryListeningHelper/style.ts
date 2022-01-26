export const style = `
<style>
    body { 
        display: grid;
        justify-content: center;
        justify-items: start;
        background-color: #DFCDC3;
        color: #333242;
        box-sizing: border-box;
    }

    main {
        width: 60ch;
        max-width: 60ch;
    }

    .list { 
        display: grid;
        justify-content: start;
        justify-items: start;
        padding: 4px;
        grid-row-gap: 8px;
    }

    .item { 
        display: grid;
        align-items: center;
        justify-items: start;
        grid-template-columns: 32px auto;
        padding: 4px;
    }

    .go-up {
        margin-bottom: 16px;
    }

    a {
        color: #333242;
        text-decoration: none;
    }

    .index {
        font-weight: 600;
        border: 1px dotted #333242;
        background-color: #DCB454;
    }
    a:hover, .item:hover {
        background-color: #DCB454;
        color: #1F6435;
    }

    .icon {
        margin-right:4px;
    }
    svg {
        width: 24px;
        height: 24px;
    }
</style>
`;
