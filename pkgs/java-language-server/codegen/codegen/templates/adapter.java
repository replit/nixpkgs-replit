package {{ package }};

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.net.URI;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class {{ clazz }}JsonAdapter extends TypeAdapter<{{ clazz }}> {
  @Override public void write(JsonWriter out, {{ clazz }} {{ instance }}) throws IOException {
    out.beginObject();
    {% for field in fields %}
    out.name("{{ field.name }}");
    {{ field.adapter[1]('out', instance + "." + field.name) }};
    {% endfor %}
    out.endObject();
  }

  @Override public {{ clazz }} read(JsonReader in) throws IOException {
    {{ clazz }} {{instance }} = new {{ clazz }}();

    JsonToken token = in.peek();

    in.beginObject();
    while (in.hasNext()) {
      token = in.peek();

      String field = "";
      if (token.equals(JsonToken.NAME)) {
        field = in.nextName();
      }

      {% for field in fields %}
      if ("{{ field.name }}".equals(field)) {
        token = in.peek();
        if (token.equals(JsonToken.NULL)) {
          in.nextNull();
        } else {
          {{ instance }}.{{ field.name }} = {{ field.adapter[0]('in') }};
        }
      } else
      {% endfor %}
      {
        // The key is unknown, skip the whole element
        new Gson().getAdapter(JsonElement.class).read(in);
      }
    }
    in.endObject();

    return {{ instance }};
  }
}
