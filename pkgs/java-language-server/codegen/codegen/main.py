import javalang
import jinja2
import pathlib
import os
import sys

nativeTypes = {
    "boolean": (
        lambda reader: f"{reader}.nextBoolean()",
        lambda writer, value: f"{writer}.value({value})",
    ),
    "Boolean": (
        lambda reader: f"{reader}.nextBoolean()",
        lambda writer, value: f"{writer}.value({value})",
    ),
    "Double": (
        lambda reader: f"{reader}.nextDouble()",
        lambda writer, value: f"{writer}.value({value})",
    ),
    "Integer": (
        lambda reader: f"{reader}.nextInt()",
        lambda writer, value: f"{writer}.value({value})",
    ),
    "int": (
        lambda reader: f"{reader}.nextInt()",
        lambda writer, value: f"{writer}.value({value})",
    ),
    "String": (
        lambda reader: f"{reader}.nextString()",
        lambda writer, value: f"{writer}.value({value})",
    ),
    "JsonElement": (
        lambda reader: f"new Gson().getAdapter(JsonElement.class).read({reader})",
        lambda writer, value: f"new Gson().getAdapter(JsonElement.class).write({writer}, {value})",
    ),
    "JsonObject": (
        lambda reader: f"new Gson().getAdapter(JsonObject.class).read({reader})",
        lambda writer, value: f"new Gson().getAdapter(JsonObject.class).write({writer}, {value})",
    ),
    "JsonArray": (
        lambda reader: f"new Gson().getAdapter(JsonArray.class).read({reader})",
        lambda writer, value: f"new Gson().getAdapter(JsonArray.class).write({writer}, {value})",
    ),
    "List": (
        lambda reader: f"new Gson().getAdapter(List.class).read({reader})",
        lambda writer, value: f"new Gson().getAdapter(List.class).write({writer}, {value})",
    ),
    "URI": (
        lambda reader: f"new Gson().getAdapter(URI.class).read({reader})",
        lambda writer, value: f"new Gson().getAdapter(URI.class).write({writer}, {value})",
    ),
    "Map": (
        lambda reader: f"new Gson().getAdapter(Map.class).read({reader})",
        lambda writer, value: f"new Gson().getAdapter(Map.class).write({writer}, {value})",
    ),
    "Object": (
        lambda reader: f"new Gson().getAdapter(Object.class).read({reader})",
        lambda writer, value: f"new Gson().getAdapter(Object.class).write({writer}, {value})",
    ),
}

env = jinja2.Environment(
    loader=jinja2.PackageLoader("codegen", "templates"),
    trim_blocks=True,
    lstrip_blocks=True,
)
adapter = env.get_template("./adapter.java")
builder = env.get_template("./builder.java")

adapters = nativeTypes
all_classes = set()

root = sys.argv[1]


def walk(clazz):
    with open(f"{root}/{clazz}.java") as source:
        ast = javalang.parse.parse("\n".join(source.readlines()))

        assert len(ast.types) == 1
        definition = ast.types[0]

        for field in definition.fields:
            for declarator in field.declarators:
                if "public" not in field.modifiers:
                    continue

                if "static" in field.modifiers:
                    continue

                if field.type.name not in adapters:
                    adapters[field.type.name] = (
                        lambda reader, type=field.type.name: f"new {type}JsonAdapter().read({reader})",
                        lambda writer, value, type=field.type.name: f"new {type}JsonAdapter().write({writer}, {value})",
                    )
                    walk(field.type.name)
                    all_classes.add(field.type.name)


def codegen(clazz):
    with open(f"{root}/{clazz}.java") as source:
        ast = javalang.parse.parse("\n".join(source.readlines()))

        assert len(ast.types) == 1
        definition = ast.types[0]

        fields = []
        for field in definition.fields:
            if "public" not in field.modifiers:
                continue

            if "static" in field.modifiers:
                continue

            for declarator in field.declarators:
                fields.append(
                    {
                        "name": declarator.name,
                        "adapter": adapters[field.type.name],
                    }
                )

        java = adapter.render(
            clazz=definition.name,
            instance=definition.name.lower(),
            fields=fields,
            package="org.javacs.lsp",
        )
        with open(f"{root}/{clazz}JsonAdapter.java", "w") as out:
            print(f"{root}/{clazz}JsonAdapter.java")
            out.write(java)


def run():
    files = os.listdir(root)
    for file in sorted(files, key=lambda f: pathlib.Path(root, f).name):
        path = pathlib.Path(root, file)
        if path.suffix == ".java":
            with open(path) as source:
                ast = javalang.parse.parse("\n".join(source.readlines()))

                if len(ast.imports) > 5:
                    print(f"Dropping {path.name}")
                    continue

                assert len(ast.types) == 1
                clazz = ast.types[0]

                if not isinstance(clazz, javalang.tree.ClassDeclaration):
                    print(f"Dropping {path.name}")
                    continue

                if "public" not in clazz.modifiers:
                    print(f"Dropping {path.name}")
                    continue

                if "abstract" in clazz.modifiers:
                    print(f"Dropping {path.name}")
                    continue

                if len(clazz.methods) > 10:
                    print(f"Dropping {path.name}")
                    continue

                if len(clazz.fields) == 0:
                    print(f"Dropping {path.name}")
                    continue

                all_classes.add(path.stem)

    for clazz in list(all_classes):
        walk(clazz)

    for clazz in all_classes:
        codegen(clazz)

    java = builder.render(
        classes=all_classes,
        package="org.javacs.lsp",
    )

    with open(f"{root}/GSONCodeGenBuilder.java", "w") as out:
        out.write(java)
