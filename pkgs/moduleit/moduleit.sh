if [ $# -eq 0 ]; then
    echo "Please provide a module file argument"
    exit 1
fi

MODULE_FILE="$1"
OUT_LINK="$2"

MODULE_FILE_ABSOLUTE_PATH="$(realpath $MODULE_FILE)"
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ENTRYPOINT_PATH="$SCRIPT_DIR/entrypoint.nix"

args=("$ENTRYPOINT_PATH" --argstr configPath "$MODULE_FILE_ABSOLUTE_PATH")

if [ ! -z "${OUT_LINK}" ]; then
  args+=(--out-link "${OUT_LINK}")
fi

echo "nix-build ${args[@]}"
nix-build "${args[@]}"

if [ -L "${OUT_LINK}" ]; then
  # If output link was provided,
  # materialize the output as an actual file containing the JSON config
  # instead of a symlink
  cp --remove-destination "$(realpath "${OUT_LINK}")" "${OUT_LINK}"
fi
